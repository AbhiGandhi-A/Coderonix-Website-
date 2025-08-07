const express = require('express');
const auth = require('../middleware/auth');
const Project = require('../models/Project');
const ProjectTask = require('../models/ProjectTask');

const router = express.Router();

// Get all projects
router.get('/', auth, async (req, res) => {
  try {
    const projects = await Project.find({
      group_id: req.user.group_id
    }).populate('created_by', 'name').sort({ created_at: -1 });

    // Get tasks for each project
    for (let project of projects) {
      const tasks = await ProjectTask.find({ project_id: project._id })
        .populate('assignee', 'name')
        .populate('created_by', 'name');
      project.tasks = tasks;
    }

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new project
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, deadline, priority, status } = req.body;

    const project = new Project({
      name,
      description,
      deadline: new Date(deadline),
      priority,
      status,
      group_id: req.user.group_id,
      created_by: req.user._id
    });

    await project.save();
    await project.populate('created_by', 'name');

    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add task to project
router.post('/:id/tasks', auth, async (req, res) => {
  try {
    const { title, description, assignee, priority, status } = req.body;

    const task = new ProjectTask({
      title,
      description,
      assignee,
      priority,
      status,
      project_id: req.params.id,
      created_by: req.user._id
    });

    await task.save();
    await task.populate('assignee', 'name');
    await task.populate('created_by', 'name');

    res.status(201).json(task);
  } catch (error) {
    console.error('Error adding task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Move task status
router.put('/tasks/:id/move', auth, async (req, res) => {
  try {
    const { status } = req.body;

    const task = await ProjectTask.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('assignee', 'name').populate('created_by', 'name');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error moving task:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
