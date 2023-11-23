// Example structure within awsUtils.js
const AWS = require('aws-sdk');

const getParameter = async (parameterName) => {
  try {
    const ssm = new AWS.SSM({ region: 'us-east-1' });
    const data = await ssm.getParameter({ Name: parameterName }).promise();
    return data.Parameter.Value;
  } catch (error) {
    console.error('Error retrieving parameter:', error);
    throw error;
  }
};

// Configure AWS SDK for Rekognition
const rekognition = new AWS.Rekognition({
  region: process.env.AWS_REGION,
});

// Configure AWS SDK for S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

module.exports = { getParameter, rekognition, s3 };