const bcrypt = require('bcryptjs');
const hash = '$2a$10$5cb6IwushxCmQEkRi8ld6.iM1nluR0IJ41R0LQXokq1/giXeVMfM.';
const password = 'mmhmmh2022';
console.log('Hash:', hash);
console.log('Password:', password);
console.log('Match:', bcrypt.compareSync(password, hash));
