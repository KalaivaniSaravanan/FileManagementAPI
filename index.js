require('dotenv/config')
const express = require('express')
const aws = require('aws-sdk')
const multer = require('multer')
const multerS3 = require('multer-s3')
const { v4: uuidv4 } = require('uuid');
const path = require('path')
const app = express()
const { getAllItems, insertItem, updateItem, getSingleItemById, deleteSingleItemById } = require('./dynamo');
const {PubSub} = require('@google-cloud/pubsub');
const pubsub = new PubSub();
const topicName = process.env.PUBSUB_TOPIC_NAME;

const PORT = process.env.PORT || 3000
const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  //sessionToken is required only if you are using awseducate account.
  // sessionToken: process.env.AWS_SESSION_TOKEN,
})

const storage = multerS3({
  s3: s3,
  bucket: process.env.BUCKET_NAME,
  key: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  },
  acl: 'public-read', //comment this if you don't want the uploaded file to be publicly accessible
})

const upload = multer({ storage })

app.post('/upload', upload.array('fileData'), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const id = uuidv4();
    
    // Prepare item for DynamoDB
    const itemObject = {
      id,
      imagePath: req.files.map(file => file.location),
      uploadedAt: new Date().toISOString(),
    };

    // Save to DynamoDB
    await insertItem('s3_image_info', itemObject);

    const uploadMessageData = {
      eventType: 'FILE_UPLOADED',
      fileId: id,
      s3Keys: req.files.map(file => file.key),
      uploadedAt: new Date().toISOString(),
      metadata: itemObject
    };
    const uploadBuffer = Buffer.from(JSON.stringify(uploadMessageData));
    console.log(`Publishing upload event for ID: ${id}`);
    await pubsub.topic(topicName).publish(uploadBuffer);

    res.status(200).json({
      message: 'Files uploaded successfully',
      fileId: id,
      urls: req.files.map(file => file.location)
    });

  } catch (error) {
    console.error('Error in upload:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Get all files metadata
app.get('/files', async (req, res) => {
  try {
    const items = await getAllItems('s3_image_info');
    res.json(items);
  } catch (error) {
    console.error('Failed to fetch items:', error);
    res.status(500).json({ error: 'Failed to fetch files metadata' });
  }
});

// Get single file metadata by ID
app.get('/files/:id', async (req, res) => {
  try {
    const item = await getSingleItemById('s3_image_info', req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'File not found' });
    }
 
    res.json(item);
  } catch (error) {
    console.error('Failed to fetch item:', error);
    res.status(500).json({ error: 'Failed to fetch file metadata' });
  }
});

// Generate presigned URL for a file
app.get('/files/:id/presigned', async (req, res) => {
  try {
    const item = await getSingleItemById('s3_image_info', req.params.id);
    if (!item || !item.imagePath || item.imagePath.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get the S3 key from the imagePath URL
    const imageUrl = item.imagePath[0];
    const key = imageUrl.split('/').pop();

    const presignedUrl = await s3.getSignedUrlPromise('getObject', {
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      Expires: 3600 // URL expires in 1 hour
    });

    res.json({ presignedUrl });
  } catch (error) {
    console.error('Failed to generate presigned URL:', error);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
});

app.delete('/files/:id', async (req, res) => {
  try {
    // 1. Get the file metadata from DynamoDB
    const result = await getSingleItemById('s3_image_info', req.params.id);
    
    if (!result || !result.Item) {
      console.error('Item not found:', req.params.id);
      return res.status(404).json({ error: 'File not found' });
    }

    const item = result.Item;
    
    // Handle both array and string cases for imagePath
    const imagePath = Array.isArray(item.imagePath) ? item.imagePath[0] : item.imagePath;
    
    if (!imagePath) {
      console.error('ImagePath is missing:', item);
      return res.status(404).json({ error: 'File path not found' });
    }

    // 2. Delete the file from S3
    const key = imagePath.split('/').pop();
    await s3.deleteObject({
      Bucket: process.env.BUCKET_NAME,
      Key: key
    }).promise();

    // 3. Delete the metadata from DynamoDB
    await deleteSingleItemById('s3_image_info', req.params.id);

    const deleteMessageData = {
      eventType: 'FILE_DELETED',
      fileId: req.params.id,
      s3Key: key,
      deletedAt: new Date().toISOString(),
      metadata: item
    };
    const deleteBuffer = Buffer.from(JSON.stringify(deleteMessageData));
    console.log(`Publishing deletion event for ID: ${req.params.id}`);
    await pubsub.topic(topicName).publish(deleteBuffer);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Failed to delete file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on PORT: ${PORT}`)
})