const sharp = require('sharp'); sharp('public/logo.webp').trim().toFile('public/logo_cropped.webp').then(() => console.log('Cropped successfully')).catch(console.error);
