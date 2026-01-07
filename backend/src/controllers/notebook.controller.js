const Notebook = require('../models/Notebook');
const Quiz = require('../models/Quiz');
const MindMap = require('../models/MindMap');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '../../uploads/sources');
fs.mkdir(UPLOADS_DIR, { recursive: true }).catch(console.error);

/**
 * @desc    Get all notebooks for current user
 * @route   GET /api/notebook/notebooks
 * @access  Private
 */
exports.getNotebooks = asyncHandler(async (req, res) => {
  const notebooks = await Notebook.find({ 
    userId: req.user._id,
    isArchived: false 
  })
    .sort({ lastAccessed: -1 })
    .select('-sources.content'); // Don't send full content in list

  res.json({
    success: true,
    count: notebooks.length,
    data: notebooks
  });
});

/**
 * @desc    Get single notebook by ID
 * @route   GET /api/notebook/notebooks/:id
 * @access  Private
 */
exports.getNotebook = asyncHandler(async (req, res) => {
  const notebook = await Notebook.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!notebook) {
    throw new AppError('Notebook not found', 404);
  }

  // Update last accessed
  notebook.lastAccessed = new Date();
  await notebook.save();

  res.json({
    success: true,
    data: notebook
  });
});

/**
 * @desc    Create new notebook
 * @route   POST /api/notebook/notebooks
 * @access  Private
 */
exports.createNotebook = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // Create AI session for this notebook
  const token = req.headers.authorization;
  let aiSessionId = null;

  try {
    const aiResponse = await axios.post(
      `${AI_ENGINE_URL}/ai/sessions`,
      { title: title || 'New Notebook Session' },
      { headers: { Authorization: token } }
    );
    aiSessionId = aiResponse.data.id;
  } catch (error) {
    console.error('Failed to create AI session:', error.message);
    // Continue without AI session - can be created later
  }

  const notebook = await Notebook.create({
    userId: req.user._id,
    title: title || 'Untitled Notebook',
    description,
    aiSessionId
  });

  res.status(201).json({
    success: true,
    data: notebook
  });
});

/**
 * @desc    Update notebook
 * @route   PUT /api/notebook/notebooks/:id
 * @access  Private
 */
exports.updateNotebook = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  const notebook = await Notebook.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!notebook) {
    throw new AppError('Notebook not found', 404);
  }

  if (title) notebook.title = title;
  if (description !== undefined) notebook.description = description;

  await notebook.save();

  res.json({
    success: true,
    data: notebook
  });
});

/**
 * @desc    Delete notebook
 * @route   DELETE /api/notebook/notebooks/:id
 * @access  Private
 */
exports.deleteNotebook = asyncHandler(async (req, res) => {
  const notebook = await Notebook.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!notebook) {
    throw new AppError('Notebook not found', 404);
  }

  // Delete all source files
  for (const source of notebook.sources) {
    if (source.filePath) {
      try {
        await fs.unlink(source.filePath);
      } catch (error) {
        console.error(`Failed to delete file: ${source.filePath}`, error.message);
      }
    }
  }

  // Delete AI session
  if (notebook.aiSessionId) {
    const token = req.headers.authorization;
    try {
      await axios.delete(
        `${AI_ENGINE_URL}/ai/sessions/${notebook.aiSessionId}`,
        { headers: { Authorization: token } }
      );
    } catch (error) {
      console.error('Failed to delete AI session:', error.message);
    }
  }

  await notebook.deleteOne();

  res.json({
    success: true,
    message: 'Notebook deleted successfully'
  });
});

/**
 * @desc    Add source to notebook
 * @route   POST /api/notebook/notebooks/:id/sources
 * @access  Private
 */
exports.addSource = asyncHandler(async (req, res) => {
  const notebook = await Notebook.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!notebook) {
    throw new AppError('Notebook not found', 404);
  }

  const { type, name, url, content } = req.body;
  const file = req.file;

  const source = {
    type,
    name: name || file?.originalname || 'Untitled Source',
    selected: true,
    dateAdded: new Date()
  };

  // Handle different source types
  if (type === 'pdf' || type === 'document') {
    if (!file) {
      throw new AppError('File is required for PDF/document sources', 400);
    }
    
    // Save file to local storage
    const fileName = `${Date.now()}-${file.originalname}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    await fs.writeFile(filePath, file.buffer);
    
    source.filePath = filePath;
    source.size = file.size;
  } else if (type === 'website') {
    if (!url) {
      throw new AppError('URL is required for website sources', 400);
    }
    source.url = url;
  } else if (type === 'text' || type === 'notes') {
    if (!content) {
      throw new AppError('Content is required for text/notes sources', 400);
    }
    source.content = content;
    source.size = content.length;
  } else {
    throw new AppError('Invalid source type', 400);
  }

  notebook.sources.push(source);
  await notebook.save();

  // Return the newly added source
  const addedSource = notebook.sources[notebook.sources.length - 1];

  res.status(201).json({
    success: true,
    data: addedSource
  });
});

/**
 * @desc    Remove source from notebook
 * @route   DELETE /api/notebook/notebooks/:id/sources/:sourceId
 * @access  Private
 */
exports.removeSource = asyncHandler(async (req, res) => {
  const notebook = await Notebook.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!notebook) {
    throw new AppError('Notebook not found', 404);
  }

  const source = notebook.sources.id(req.params.sourceId);
  
  if (!source) {
    throw new AppError('Source not found', 404);
  }

  // Delete file if exists
  if (source.filePath) {
    try {
      await fs.unlink(source.filePath);
    } catch (error) {
      console.error(`Failed to delete file: ${source.filePath}`, error.message);
    }
  }

  source.deleteOne();
  await notebook.save();

  res.json({
    success: true,
    message: 'Source removed successfully'
  });
});

/**
 * @desc    Toggle source selection
 * @route   PATCH /api/notebook/notebooks/:id/sources/:sourceId
 * @access  Private
 */
exports.toggleSource = asyncHandler(async (req, res) => {
  const notebook = await Notebook.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!notebook) {
    throw new AppError('Notebook not found', 404);
  }

  const source = notebook.sources.id(req.params.sourceId);
  
  if (!source) {
    throw new AppError('Source not found', 404);
  }

  source.selected = !source.selected;
  await notebook.save();

  res.json({
    success: true,
    data: source
  });
});

/**
 * @desc    Get source content (for chat context)
 * @route   GET /api/notebook/notebooks/:id/sources/:sourceId/content
 * @access  Private
 */
exports.getSourceContent = asyncHandler(async (req, res) => {
  const notebook = await Notebook.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!notebook) {
    throw new AppError('Notebook not found', 404);
  }

  const source = notebook.sources.id(req.params.sourceId);
  
  if (!source) {
    throw new AppError('Source not found', 404);
  }

  let content = '';

  if (source.filePath) {
    // Read file content
    content = await fs.readFile(source.filePath, 'utf-8');
  } else if (source.content) {
    content = source.content;
  } else if (source.url) {
    content = `Website: ${source.url}`;
  }

  res.json({
    success: true,
    data: {
      id: source._id,
      name: source.name,
      type: source.type,
      content
    }
  });
});

/**
 * @desc    Link artifact to notebook
 * @route   POST /api/notebook/notebooks/:id/artifacts
 * @access  Private
 */
exports.linkArtifact = asyncHandler(async (req, res) => {
  const notebook = await Notebook.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!notebook) {
    throw new AppError('Notebook not found', 404);
  }

  const { type, referenceId, title } = req.body;

  // Validate artifact exists
  if (type === 'quiz') {
    const quiz = await Quiz.findOne({ _id: referenceId, userId: req.user._id });
    if (!quiz) throw new AppError('Quiz not found', 404);
  } else if (type === 'mindmap') {
    const mindmap = await MindMap.findOne({ _id: referenceId, userId: req.user._id });
    if (!mindmap) throw new AppError('Mind map not found', 404);
  }

  // Check if already linked
  const existing = notebook.artifacts.find(
    a => a.type === type && a.referenceId.toString() === referenceId
  );

  if (existing) {
    return res.json({
      success: true,
      message: 'Artifact already linked',
      data: existing
    });
  }

  notebook.artifacts.push({
    type,
    referenceId,
    title: title || `${type.charAt(0).toUpperCase() + type.slice(1)}`
  });

  await notebook.save();

  const addedArtifact = notebook.artifacts[notebook.artifacts.length - 1];

  res.status(201).json({
    success: true,
    data: addedArtifact
  });
});

/**
 * @desc    Unlink artifact from notebook
 * @route   DELETE /api/notebook/notebooks/:id/artifacts/:artifactId
 * @access  Private
 */
exports.unlinkArtifact = asyncHandler(async (req, res) => {
  const notebook = await Notebook.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!notebook) {
    throw new AppError('Notebook not found', 404);
  }

  const artifact = notebook.artifacts.id(req.params.artifactId);
  
  if (!artifact) {
    throw new AppError('Artifact not found', 404);
  }

  artifact.deleteOne();
  await notebook.save();

  res.json({
    success: true,
    message: 'Artifact unlinked successfully'
  });
});

/**
 * @desc    Get selected sources content for chat context
 * @route   GET /api/notebook/notebooks/:id/context
 * @access  Private
 */
exports.getNotebookContext = asyncHandler(async (req, res) => {
  const notebook = await Notebook.findOne({
    _id: req.params.id,
    userId: req.user._id
  });

  if (!notebook) {
    throw new AppError('Notebook not found', 404);
  }

  const selectedSources = notebook.sources.filter(s => s.selected);
  const context = [];

  for (const source of selectedSources) {
    let content = '';

    if (source.filePath) {
      try {
        content = await fs.readFile(source.filePath, 'utf-8');
      } catch (error) {
        content = `[Error reading file: ${source.name}]`;
      }
    } else if (source.content) {
      content = source.content;
    } else if (source.url) {
      content = `Website: ${source.url}`;
    }

    context.push({
      id: source._id,
      name: source.name,
      type: source.type,
      content: content.substring(0, 10000) // Limit to prevent huge payloads
    });
  }

  res.json({
    success: true,
    data: {
      notebookId: notebook._id,
      aiSessionId: notebook.aiSessionId,
      sources: context
    }
  });
});

module.exports = exports;
