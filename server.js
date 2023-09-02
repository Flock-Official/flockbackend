const express = require('express');
const cors = require('cors');

const mysql = require('mysql');


const app = express();

app.get('/', (req, res) => {
  res.send('Default backend');
});
app.use(cors({ origin: 'http://localhost:3000' }));
app.listen(8080, () => {
  console.log('Server is listening on port 8080');
});
//http://localhost:3000

//i create da connection
/*
const pool = mysql.createPool({
  host: '34.30.127.40',
  port: '3306',
  user: 'flock-instance',
  password: 'flockapp0416',
  database: 'flock',
});
*/
const pool = mysql.createPool({
  host: "localhost",
  socketPath: "/cloudsql/temporal-trees-383213:us-central1:flock-instance",
  user: "flock-instance",
  password: "flockapp0416",
  database: "flock",
  debug: true,
});

// ALL EVERYONE AND THEIR LOCATIONZ
app.get('/users/locations', (req, res) => {
  pool.query('SELECT * FROM user_locations', (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error retrieving user locations');
    } else {
      res.json(results);
    }
  });
});

// if u want specific user location
app.get('/users/locations/:user_id', (req, res) => {
  const userId = req.params.user_id;
  pool.query('SELECT * FROM user_locations WHERE user_id = ?', [userId], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error retrieving user location');
    } else if (results.length === 0) {
      res.status(404).send('User location not found');
    } else {
      res.json(results[0]);
    }
  });
});


// dis all for new user location
// API endpoint for creating da user locations
app.post('/users/locations', (req, res) => {
  try {
    const {user_id, latitude, longitude } = req.body;
    const timestamp = new Date(); // Get the current timestamp

    // insert da new user location into the database
    const query = `
      INSERT INTO user_locations (user_id, latitude, longitude, timestamp, location)
      VALUES (?, ?, ?, ?, ST_GeomFromText(CONCAT('POINT(', ?, ' ', ?, ')')))
    `;
    pool.query(query, [user_id, latitude, longitude, timestamp, longitude, latitude]);

    // dis shows if success
    res.status(201).json({ message: 'User location created successfully' });
  } catch (error) {
    console.error('Error creating user location:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// UpDATEU a user location
app.put('/users/locations/:user_id', (req, res) => {
  const userId = req.params.user_id;
  //contains latitude and longitude
  const { latitude, longitude } = req.body;

  const timestamp = new Date(); // GET DA CURRENT TIMESTAMP

  const query = `
    UPDATE user_locations SET latitude = ?,longitude = ?,timestamp = ?, location=ST_GeomFromText(CONCAT('POINT(', ?, ' ', ?, ')'))
    WHERE user_id = ?
    `;

  pool.query(query, [latitude,longitude,timestamp,longitude,latitude,userId], (error, result) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error updating user location');
    } else if (result.affectedRows === 0) {
      res.status(404).send('User location not found');
    } else {
      res.json({ message: 'User location updated successfully' });
    }
  });
});

// Delete a user location BYE LOL
app.delete('/users/locations/:user_id', (req, res) => {
  const userId = req.params.user_id;
  pool.query('DELETE FROM user_locations WHERE user_id = ?', [userId], (error, result) => {
    if (error) {
      console.error(error);
      res.status(500).send('Error deleting user location');
    } else if (result.affectedRows === 0) {
      res.status(404).send('User location not found');
    } else {
      res.json({ message: 'User location deleted successfully' });
    }
  });
});

// API endpoint to get nearby user locations by radius
app.post('/users/locations/nearby', (req, res) => {
  const { latitude, longitude } = req.body;
  const radius = req.query.radius;

  // query da user_locations table for nearest locations
  const query = `
    SELECT
      user_id, latitude, longitude
    FROM
      user_locations
    WHERE
      ST_DISTANCE_SPHERE(location, ST_GeomFromText('POINT(? ?)')) * 0.000621371 <= ?
  `;

  pool.query(query, [longitude, latitude, radius], (error, results) => {

    if (error) {
      console.error(error);
      res.status(500).send('Error finding nearby user locations');
    } else if (results.length === 0) {
      res.status(404).send('No nearby user location found');
    } else {
      res.json(results);
    }
  })
});

app.get('/users', (req, res) => {
    pool.getConnection((err, connection) => {
      if (err) {
        console.error('Error connecting to database:', err);
        return res.status(500).json({ error: 'Failed to connect to database' });
      }
  
      connection.query('SELECT * FROM users', (err, results) => {
        connection.release();
  
        if (err) {
          console.error('Error executing query:', err);
          return res.status(500).json({ error: 'Failed to fetch data from database' });
        }
  
        res.json(results);
      });
    });
});

app.get('/users/:id', (req, res) => {
    const userId = req.params.id;

    pool.getConnection((err, connection) => {
        if (err) {
          console.error('Error connecting to database:', err);
          return res.status(500).json({ error: 'Failed to connect to database' });
        }
  
        const sql = 'SELECT * FROM users WHERE user_id = ?';
    
        connection.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).json({ error: 'Failed to fetch data from database' });
            return;
        }
    
        if (results.length === 0) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
    
        res.json(results[0]);
        });
    })
});
  