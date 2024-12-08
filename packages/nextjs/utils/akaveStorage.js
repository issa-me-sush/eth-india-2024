const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const AKAVE_API_BASE_URL = 'http://localhost:8000'; // Assuming local instance

async function uploadToAkave(bucketName, filePath) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));

  try {
    const response = await axios.post(`${AKAVE_API_BASE_URL}/buckets/${bucketName}/files`, form, {
      headers: form.getHeaders(),
    });
    console.log('File uploaded to Akave:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading to Akave:', error.response ? error.response.data : error.message);
    return null;
  }
}

module.exports = {
  uploadToAkave
};