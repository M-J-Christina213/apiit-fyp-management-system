const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const path = require("path");
const fs = require("fs");

// Get all templates
const getTemplates = async (req, res) => {
    try {

        const templates = await prisma.templates.findMany({
            orderBy: {
                uploaded_at: "desc"
            }
        });

        res.json(templates);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Failed to fetch templates"
        });

    }
};

// Upload template
const uploadTemplate = async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                message: "No file uploaded."
            });
        }

        const template = await prisma.templates.create({

            data: {

                title: req.body.title,

                stage: req.body.stage,

                file_name: req.file.originalname,

                file_type: path.extname(req.file.originalname),

                file_size: `${(req.file.size / 1024).toFixed(2)} KB`,

                file_path: req.file.filename

            }

        });

        res.status(201).json(template);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Upload failed."
        });

    }

};


// Download template
const downloadTemplate = async (req, res) => {

    try {

        const template = await prisma.templates.findUnique({
            where: {
                id: Number(req.params.id)
            }
        });

        if (!template) {

            return res.status(404).json({
                message: "Template not found."
            });

        }

        const filePath = path.join(
            __dirname,
            "../uploads/templates",
            template.file_path
        );

        res.download(filePath, template.file_name);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Download failed."
        });

    }

};

// Delete template
const deleteTemplate = async (req, res) => {

    try {

        const template = await prisma.templates.findUnique({
            where: {
                id: Number(req.params.id)
            }
        });

        if (!template) {

            return res.status(404).json({
                message: "Template not found."
            });

        }

        const filePath = path.join(
            __dirname,
            "../uploads/templates",
            template.file_path
        );

        if (fs.existsSync(filePath)) {

            fs.unlinkSync(filePath);

        }

        await prisma.templates.delete({
            where: {
                id: Number(req.params.id)
            }
        });

        res.json({
            message: "Template deleted."
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            message: "Delete failed."
        });

    }

};

// Update template title
const updateTemplate = async (req, res) => {
    try {
        const { title } = req.body;
        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Title is required." });
        }
        const template = await prisma.templates.update({
            where: { id: Number(req.params.id) },
            data: { title: title.trim() }
        });
        res.json(template);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Update failed." });
    }
};


// View template inline (opens in browser tab)
const viewTemplate = async (req, res) => {
    try {
        const template = await prisma.templates.findUnique({
            where: { id: Number(req.params.id) }
        });

        if (!template) {
            return res.status(404).json({ message: "Template not found." });
        }

        const filePath = path.join(__dirname, "../uploads/templates", template.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File not found on disk." });
        }

        // Determine MIME type
        const ext = path.extname(template.file_name).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.txt': 'text/plain',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.doc': 'application/msword',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.xls': 'application/vnd.ms-excel',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };

        const mimeType = mimeTypes[ext] || 'application/octet-stream';

        res.setHeader('Content-Type', mimeType);
        // 'inline' tells the browser to display it rather than save it
        res.setHeader('Content-Disposition', `inline; filename="${template.file_name}"`);

        fs.createReadStream(filePath).pipe(res);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "View failed." });
    }
};

module.exports = {
    getTemplates,
    uploadTemplate,
    downloadTemplate,
    deleteTemplate,
    updateTemplate,
    viewTemplate
};