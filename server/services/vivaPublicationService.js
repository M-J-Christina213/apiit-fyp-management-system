const prisma = require('../config/prisma');
const MicrosoftGraphService = require('./microsoftGraphService');
const { VivaMeetingPublisher } = require('./vivaMeetingPublisher');

module.exports = new VivaMeetingPublisher({ db: prisma, getAccessToken: id => MicrosoftGraphService.getValidAccessToken(id) });
