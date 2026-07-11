const msal = require("@azure/msal-node");


const config = {

    auth: {

        clientId: process.env.AZURE_CLIENT_ID,

        authority:
            `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,

        clientSecret:
            process.env.AZURE_CLIENT_SECRET

    }

};


const cca = new msal.ConfidentialClientApplication(config);


module.exports = cca;