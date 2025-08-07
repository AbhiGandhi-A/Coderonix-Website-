const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const Group = require('../models/Group');
const auth = require('../middleware/auth');

const router = express.Router();

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});


// Generate unique member ID
const generateMemberId = () => {
  return 'MEM' + Math.random().toString(36).substr(2, 8).toUpperCase();
};

// Register group with leader and members
router.post('/register-group', async (req, res) => {
  try {
    const { leader, members, groupName } = req.body;
    
    // Create group ID
    const groupId = 'GRP' + Math.random().toString(36).substr(2, 8).toUpperCase();
    
    // Hash leader password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(leader.password, salt);
    
    // Create leader
    const leaderUser = new User({
      group_id: groupId,
      role: 'leader',
      username: leader.username,
      password: hashedPassword,
      name: leader.name,
      email: leader.email
    });
    
    await leaderUser.save();
    
    // Create members with generated credentials
    const memberUsers = [];
    const memberCredentials = [];
    
    for (const member of members) {
      const memberId = generateMemberId();
      const memberPassword = Math.random().toString(36).substr(2, 10);
      const hashedMemberPassword = await bcrypt.hash(memberPassword, salt);
      
      const memberUser = new User({
        group_id: groupId,
        role: 'member',
        username: memberId,
        password: hashedMemberPassword,
        name: member.name,
        email: member.email,
        member_id: memberId
      });
      
      await memberUser.save();
      memberUsers.push(memberUser);
      memberCredentials.push({
        name: member.name,
        member_id: memberId,
        password: memberPassword
      });
    }
    
    // Create group
    const group = new Group({
      group_name: groupName,
      leader_id: leaderUser._id,
      members: memberUsers.map(m => m._id)
    });
    
    await group.save();
    
    res.status(201).json({
      message: 'Group created successfully',
      group_id: groupId,
      member_credentials: memberCredentials
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await User.findOne({
      $or: [{ username }, { member_id: username }]
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        group_id: user.group_id,
        member_id: user.member_id
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Forgot Password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by username, email, or member_id
    const user = await User.findOne({
      $or: [
        { email: email },
        { username: email },
        { member_id: email }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found with this email/username' });
    }
    
    // Generate a temporary password
    const tempPassword = Math.random().toString(36).substr(2, 12);
    
    // Hash the temporary password
    const salt = await bcrypt.genSalt(10);
    const hashedTempPassword = await bcrypt.hash(tempPassword, salt);
    
    // Update user's password
    user.password = hashedTempPassword;
    await user.save();
    
    // Send email with temporary password
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset - Codronix',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset</h2>
          <p>Hello ${user.name},</p>
          <p>Your password has been reset. Here are your login credentials:</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Username/Member ID:</strong> ${user.username || user.member_id}</p>
            <p><strong>Temporary Password:</strong> ${tempPassword}</p>
          </div>
          <p style="color: #dc3545;"><strong>Important:</strong> Please change this password after logging in for security purposes.</p>
          <p>If you didn't request this password reset, please contact support immediately.</p>
          <p>Best regards,<br>Codronix Team</p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    
    res.json({ message: 'Password sent to your email address successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error while sending password' });
  }
});

router.post('/update-password', auth, async (req, res) => {
  try {
    const { tempPassword, newPassword } = req.body;
    
    if (!tempPassword || !newPassword) {
      return res.status(400).json({ message: 'Temporary password and new password are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long' });
    }
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify temporary password
    const isValidTempPassword = await bcrypt.compare(tempPassword, user.password);
    if (!isValidTempPassword) {
      return res.status(400).json({ message: 'Invalid temporary password' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedNewPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hashedNewPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
