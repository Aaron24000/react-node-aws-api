const express = require('express');
const router = express.Router();

// Import validators
const {userRegisterValidator, userLoginValidator, forgotPasswordValidator, resetPasswordValidator} = require('../validators/auth');
const {runValidation} = require('../validators');

// import from controllers
const { register, registerActivate, login, requireSignin, resetPassword, forgotPassword } = require('../controllers/auth');

router.post('/register', userRegisterValidator, runValidation, register);

router.post('/register/activate', registerActivate);

router.post('/login', userLoginValidator, runValidation, login);

router.put('/forgot-password', forgotPasswordValidator, runValidation, forgotPassword);

router.put('/reset-password', resetPasswordValidator, runValidation, resetPassword);

// router.get('/secret', requireSignin, (req, res) => {
//     res.json({
//         data: 'This is a secret page for logged in users only'
//     })
// })

module.exports = router;