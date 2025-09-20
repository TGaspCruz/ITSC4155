const app = require('./app');
require('dotenv').config();
const port = process.env.PORT || 4000;

const server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`)
});

