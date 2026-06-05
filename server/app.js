require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./src/middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/streams', require('./src/routes/classStream.routes'));
app.use('/api/students', require('./src/routes/student.routes'));
app.use('/api/subjects', require('./src/routes/subject.routes'));
app.use('/api/stream-subjects', require('./src/routes/streamSubject.routes'));
app.use('/api/scores', require('./src/routes/score.routes'));
app.use('/api/results', require('./src/routes/results.routes'));
app.use('/api/pdf', require('./src/routes/pdf.routes'));
app.use('/api/grading-scales', require('./src/routes/gradingScale.routes'));

app.get('/', (req, res) => {
  res.json({ message: 'ikonex SMS API is running' });
});

app.use(errorHandler);

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
