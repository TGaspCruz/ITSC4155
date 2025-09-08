const app = require('./app');
const port = process.env.PORT || 3000;

const server = app.listen(3000, () => {
    console.log(`Server is running on port ${port}`)
});

