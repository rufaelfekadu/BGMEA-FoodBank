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

module.exports = { getParameter };