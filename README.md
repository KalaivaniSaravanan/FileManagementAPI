# Project Documentation: File Management and Metadata API

---

## **Project Title:** File Management and Metadata API

---

## **Project Overview**

This project involves building a **File Management System** backend application using **Express.js**. The application allows users to upload, retrieve, and manage files while integrating with **Google Pub/Sub** for message processing, **AWS S3** for file storage, and **DynamoDB** for managing metadata about the uploaded files.

---

## **Objectives**

1. Introduce foundational concepts in backend development:
   - Using Express.js for building RESTful APIs.
   - Employing Google Pub/Sub for message processing.
   - Utilizing AWS S3 for file storage.
   - Managing metadata with DynamoDB.

2. Teach backend best practices, including:
   - API design.
   - Error handling.
   - Authentication and validation (optional).

---

## **Features and Requirements**

### 1. **User Authentication (Optional)**
- Implement basic token-based authentication using middleware.

### 2. **File Upload**
- Endpoint `/upload`:
  - Upload files to **AWS S3**.
  - Store file metadata (e.g., filename, upload time, S3 URL) in **DynamoDB**.
  - Publish an event to **Google Pub/Sub** after a successful upload.

### 3. **File Retrieval**
- Endpoint `/files/:id`:
  - Retrieve metadata of a specific file from **DynamoDB**.
  - Provide a pre-signed S3 URL for downloading the file.

### 4. **File List**
- Endpoint `/files`:
  - List all uploaded files with their metadata.

### 5. **File Deletion**
- Endpoint `/delete/:id`:
  - Delete a file from **S3** and remove its metadata from **DynamoDB**.
  - Publish a deletion event to **Google Pub/Sub**.

---

## **Technical Stack**

- **Backend Framework**: Express.js
- **Google Services**: Pub/Sub for message processing.
- **AWS Services**:
  - **S3**: For storing uploaded files.
  - **DynamoDB**: For storing file metadata.
- **Database**: AWS DynamoDB
- **Programming Language**: JavaScript (Node.js)
- **Tooling**: Postman (for testing APIs)

---

## **Endpoints**

### **1. Upload Files**
**`POST /upload`**

- **Description:** Upload files to S3, store metadata in DynamoDB, and publish an event to Google Pub/Sub.
- **Request:**
  - **Headers:** `Content-Type: multipart/form-data`
  - **Body:**
    - `fileData` (form-data): Files to upload.
- **Response:**
  ```json
  {
    "message": "File Uploaded Successfully",
    "uploaded": <number_of_files>,
    "filesPath": ["<S3_file_URL_1>", "<S3_file_URL_2>"]
  }
  ```

---

### **2. Get All Files Metadata**
**`GET /files`**

- **Description:** Retrieve metadata for all uploaded files stored in DynamoDB.
- **Request:** None.
- **Response:**
  ```json
  [
    {
      "id": "<file_id>",
      "imagePath": ["<S3_file_URL>"],
      "createdAt": "<timestamp>"
    },
    ...
  ]
  ```

---

### **3. Get Single File Metadata**
**`GET /files/:id`**

- **Description:** Retrieve metadata for a specific file by ID.
- **Request:**
  - **Path Parameter:** `:id` (string): Unique ID of the file.
- **Response (Success):**
  ```json
  {
    "id": "<file_id>",
    "imagePath": ["<S3_file_URL>"],
    "createdAt": "<timestamp>"
  }
  ```
- **Response (File Not Found):**
  ```json
  {
    "error": "File not found"
  }
  ```

---

### **4. Generate Presigned URL for File Download**
**`GET /files/:id/presigned`**

- **Description:** Generate a temporary presigned URL for downloading a specific file.
- **Request:**
  - **Path Parameter:** `:id` (string): Unique ID of the file.
- **Response (Success):**
  ```json
  {
    "presignedUrl": "<temporary_S3_URL>"
  }
  ```
- **Response (File Not Found):**
  ```json
  {
    "error": "File not found"
  }
  ```

---

### **5. Delete File**
**`DELETE /files/:id`**

- **Description:** Delete a file from S3 and remove its metadata from DynamoDB. Publish a deletion event to Google Pub/Sub.
- **Request:**
  - **Path Parameter:** `:id` (string): Unique ID of the file.
- **Response (Success):**
  ```json
  {
    "message": "File deleted successfully"
  }
  ```
- **Response (File Not Found):**
  ```json
  {
    "error": "File not found"
  }
  ```

---

## **Suggested Project Plan**

### **Week 1: Basics**
- Set up the development environment.
- Learn the basics of Express.js and REST API principles.
- Understand Google Pub/Sub, AWS S3, and DynamoDB concepts.

### **Week 2: API Development**
- Implement file upload functionality and integrate it with AWS S3.
- Save metadata in DynamoDB.
- Publish events to Google Pub/Sub upon file upload.

### **Week 3: Retrieval and Management**
- Create APIs for retrieving file metadata and generating pre-signed S3 URLs.
- Implement file deletion functionality and publish deletion events to Pub/Sub.

### **Week 4: Testing and Finalization**
- Test the application using Postman.
- Write minimal documentation for the API (endpoint descriptions, request/response formats).
- Deploy the app locally or on AWS Lambda for demonstration.

---

## **Environment Variables**

Add the following variables to your `.env` file:

| Variable Name           | Description                                |
|-------------------------|--------------------------------------------|
| `AWS_ACCESS_KEY_ID`     | AWS access key for S3 authentication.      |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for S3 authentication.      |
| `BUCKET_NAME`           | Name of the S3 bucket for file storage.    |
| `PUBSUB_TOPIC_NAME`     | Google Pub/Sub topic for events.           |
| `PORT`                  | Port for the server (default: 3000).       |

---

## **Testing Tools**

- Use **Postman** to test the endpoints and verify request/response formats.
- Check logs for Google Pub/Sub events and AWS S3 operations.

---

## **Conclusion**

This project provides practical experience with backend development, integrating third-party services (AWS, Google Pub/Sub), and managing APIs. It serves as a foundational exercise to learn modern development practices and build confidence in creating scalable and maintainable applications.

