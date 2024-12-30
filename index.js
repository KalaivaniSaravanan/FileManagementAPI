require('dotenv/config')
const express = require('express')
const aws = require('aws-sdk')
const multer = require('multer')
const multerS3 = require('multer-s3')
const { v4: uuidv4 } = require('uuid');
const path = require('path')
const app = express()
const { getAllItems, insertItem, updateItem, getSingleItemById, deleteSingleItemById } = require('./dynamo');
const { PubSub } = require('@google-cloud/pubsub');
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
  
  const newItem = {
    id: uuidv4(), // Generates a unique identifier 
    imagePath: req.files.map((file) => file.location),
    createdAt: new Date().toISOString(), // Current date and time in ISO format
  };
  
  // Insert the new item into DynamoDB
  try {
    const insertedItem = await insertItem("s3_image_info", newItem);
    console.log(insertedItem);
    // You can further process insertedItem if needed
  } catch (error) {
    // Handle insertion error
    console.error('Failed to insert item:', error);
  }


  res.send({
    message: 'File Uploaded Successfully',
    uploaded: req.files.length,
    filesPath: req.files.map((file) => file.location),
  })
})

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
    const item = await getSingleItemById('s3_image_info', req.params.id);
    if (!item || !item.imagePath || item.imagePath.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 2. Delete the file from S3
    const imageUrl = item.imagePath[0];
    const key = imageUrl.split('/').pop();
    await s3.deleteObject({
      Bucket: process.env.BUCKET_NAME,
      Key: key
    }).promise();

    // 3. Delete the metadata from DynamoDB
    await deleteSingleItemById('s3_image_info', req.params.id);

    // 4. Publish deletion event to Pub/Sub
    const messageData = {
      fileId: req.params.id,
      s3Key: key,
      deletedAt: new Date().toISOString(),
      metadata: item
    };

    const dataBuffer = Buffer.from(JSON.stringify(messageData));
    await pubsub.topic(topicName).publish(dataBuffer);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Failed to delete file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on PORT: ${PORT}`)
})