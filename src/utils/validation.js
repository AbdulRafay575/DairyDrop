const validateEmail = (email) => {
  const re = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
};

const validatePhone = (phone) => {
  const re = /^\+?[\d\s-()]{10,}$/;
  return re.test(phone);
};

const validatePassword = (password) => {
  return password.length >= 6;
};

const generateToken = (userId) => {
  const jwt = require('jsonwebtoken');
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

const sanitizeUser = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  delete userObj.password;
  return userObj;
};

module.exports = {
  validateEmail,
  validatePhone,
  validatePassword,
  generateToken,
  sanitizeUser
};