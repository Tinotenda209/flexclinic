const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // For parsing application/json
app.use(express.urlencoded({ extended: true }));
app.use(cors());
//app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' directory
app.use(express.static(path.join(__dirname)));// Serve static files from the root directory (if index.html is in Group Project)


// Connect to SQLite database
const db = new sqlite3.Database('healthcare_appointment_system.db', sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log('Connected to the healthcare_appointment_system database.');
    }
});

// Fetch data from the database tables

/*// Providers table
app.get('/api/providers', (req, res) => {
    db.all('SELECT * FROM providers', [], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});*/



// Fetch data from the database
app.get('/api/providers', (req, res) => {
    db.all('SELECT * FROM providers', [], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Other GET endpoints
const getEndpoints = [
    { route: '/api/appointments', table: 'appointments' },
    { route: '/api/approved_appointments', table: 'approved_appointments' },
    { route: '/api/cancelled-appointments', table: 'Cancelled_appointments' },
    { route: '/api/patients', table: 'patients' },
    { route: '/api/staff', table: 'staff' }
];

getEndpoints.forEach(endpoint => {
    app.get(endpoint.route, (req, res) => {
        db.all(`SELECT * FROM ${endpoint.table}`, [], (err, rows) => {
            if (err) {
                res.status(400).json({ error: err.message });
                return;
            }
            res.json(rows);
        });
    });
});


// DELETE endpoint for Providers
app.delete('/api/providers/:id', (req, res) => {
    const id = req.params.id;
    db.run('DELETE FROM providers WHERE id = ?', [id], function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Provider deleted successfully.' });
    });
});

// Other DELETE endpoints
const deleteEndpoints = [
    { route: '/api/appointments/:id', table: 'appointments' },
   { route: '/api/approved_appointments/:id', table: 'approved_appointments' },
    { route: '/api/cancelled-appointments/:id', table: 'cancelled_appointments' },
    { route: '/api/patients/:id', table: 'patients' },
    { route: '/api/staff/:id', table: 'staff' }
];

deleteEndpoints.forEach(endpoint => {
    app.delete(endpoint.route, (req, res) => {
        const id = req.params.id;
        db.run(`DELETE FROM ${endpoint.table} WHERE id = ?`, [id], function(err) {
            if (err) {
                return res.status(400).json({ error: err.message });
            }
            res.json({ message: `${endpoint.table} deleted successfully.` });
        });
    });
});



//approved appointments table
const getApprovedAppointments = (req, res) => {
    const email = req.query.email;

    // SQL query to select appointments based on the provided email
    const sql = `SELECT * FROM approved_appointments WHERE email = ?`;

    db.all(sql, [email], (err, rows) => {
        if (err) {
            console.error(err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json(rows); // Send back the approved appointments data
    });
};

app.get('/api/approved_appointments', getApprovedAppointments);
//cancelled appointments table                 
app.get('/api/cancelled_appointments', (req, res) => {
    db.all('SELECT * FROM Cancelled_appointments', [], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

/*//patients table
app.get('/api/patients', (req, res) => {
    db.all('SELECT * FROM patients', [], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});*/

/*// staff table
app.get('/api/staff', (req, res) => {
    db.all('SELECT * FROM staff', [], (err, rows) => {
        if (err) {
            res.status(400).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});*/



// Route for the homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Group Project', 'index.html'));
});

// Patient login 
const loginPatient = (req, res) => {
    const { Email, Password } = req.body;
    db.get('SELECT * FROM patients WHERE email = ?', [Email], (err, row) => {
        if (err) return res.status(500).send('Error querying the database.');
        if (!row) return res.status(401).send('User not found. Please register your details.');

        bcrypt.compare(Password, row.password, (err, result) => {
            if (err || !result) return res.status(401).send('Incorrect password.');
            const { name, surname, email, phone } = row;
            res.json({ name, surname, email, phone });
        });
    });
};
//Register patient
const registerPatient = (req, res) => {
    const { Email, Password, Name, Surname, Phone } = req.body;
    db.get('SELECT * FROM patients WHERE email = ?', [Email], (err, row) => {
        if (err) return res.status(500).send('Error querying the database.');
        if (row) return res.status(409).send('Email already taken.');

        bcrypt.hash(Password, 10, (err, hash) => {
            if (err) return res.status(500).send('Error hashing password.');
            db.run('INSERT INTO patients (email, password, name, surname, phone) VALUES (?, ?, ?, ?, ?)', 
                [Email, hash, Name, Surname, Phone], function(err) {
                    if (err) return res.status(500).send('Error adding user to the database.');
                    res.status(201).send('User registered successfully.');
                });
        });
    });
};

app.post('/api/patients', loginPatient);
app.post('/api/patients/register', registerPatient);

// Staff login 
const loginstaff = (req, res) => {
    const { Email, Password } = req.body;
    db.get('SELECT * FROM staff WHERE email = ?', [Email], (err, row) => {
        if (err) return res.status(500).send('Error querying the database.');
        if (!row) return res.status(401).send('User not found. Please register your details.');

        bcrypt.compare(Password, row.password, (err, result) => {
            if (err || !result) return res.status(401).send('Incorrect password.');
            res.redirect('/staffupdate.html');
        });
    });
};


app.post('/api/staff', loginstaff);

//staff register
const addstaff = (req, res) => {
    const { Email, Password, Name, Surname } = req.body;
    db.get('SELECT * FROM staff WHERE email = ?', [Email], (err, row) => {
        if (err) return res.status(500).send('Error querying the database.');
        if (row) return res.status(409).send('Email already taken.');

        bcrypt.hash(Password, 10, (err, hash) => {
            if (err) return res.status(500).send('Error hashing password.');
            db.run('INSERT INTO staff (email, password, name, surname) VALUES (?, ?, ?, ?)', 
                [Email, hash, Name, Surname], function(err) {
                    if (err) return res.status(500).send('Error adding user to the database.');
                    res.status(201).send('User registered successfully.');
                });
        });
    });
};

app.post('/api/staff/register', addstaff);

//Create an appointment
const CreateAppointment = (req, res) => {
    const { name, surname, email, date } = req.body;
    const sql = `INSERT INTO appointments (name, surname, email, date) VALUES (?, ?, ?, ?)`;
    const params = [name, surname, email, date];

    db.run(sql, params, function(err) {
        if (err) {
            console.error('Error saving appointment:', err.message);
            return res.status(400).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, message: 'Appointment registered!' });
    });
};

// Endpoint to submit appointment
app.post('/api/appointments', CreateAppointment);

// View Pending Appoinments

// Doctor login 
const Doctorlogin = (req, res) => {
    const { Email, Password } = req.body;
    db.get('SELECT * FROM providers WHERE email = ?', [Email], (err, row) => {
        if (err) return res.status(500).send('Error querying the database.');
        if (!row) return res.status(401).send('User not found. Please register your details.');

        bcrypt.compare(Password, row.password, (err, result) => {
            if (err || !result) return res.status(401).send('Incorrect password.');
            res.redirect('/providerstable.html');
        });
    });
};


app.post('/api/providers', Doctorlogin);

// Function to register a DOCTOR
const addprovider = (req, res) => {
    const { Email, Password, Name, Surname, Availability, Speciality } = req.body;
    db.get('SELECT * FROM providers WHERE email = ?', [Email], (err, row) => {
        if (err) return res.status(500).send('Error querying the database.');
        if (row) return res.status(409).send('Email already taken.');

        bcrypt.hash(Password, 10, (err, hash) => {
            if (err) return res.status(500).send('Error hashing password.');
            db.run('INSERT INTO providers (email, password, name, surname, availability , speciality) VALUES (?, ?, ?, ?, ?, ?)', 
                [Email, hash, Name, Surname, Availability , Speciality], function(err) {
                    if (err) return res.status(500).send('Error adding user to the database.');
                    res.status(201).send('User registered successfully.');
                });
        });
    });
};

// Endpoint to retrieve provider details by email
app.post('/api/provider/register', addprovider);

// Endpoint to retrieve provider details by email
app.put('/api/providers/availability', (req, res) => {
    const providerId = req.params.id;
    const { availability } = req.body;

    if (availability === undefined) {
        return res.status(400).send('Availability is required.');
    }

    db.run('UPDATE providers SET availability = ? WHERE id = ?', [availability, providerId], function(err) {
        if (err) {
            return res.status(500).send('Failed to update availability');
        }
        if (this.changes === 0) {
            return res.status(404).send('Provider not found');
        }
        res.json({ message: 'Availability updated successfully' });
    });
});

// Endpoint to approve_appointment
const registerAppointment = (req, res) => {
    const { name, surname, email, date, time, doctor, status } = req.body;

    db.get('SELECT * FROM approved_appointments WHERE email = ? AND date = ? AND time = ?', [email, date, time], (err, row) => {
        if (err) {
            console.error('Error querying the database:', err);
            return res.status(500).send('Error querying the database.');
        }
        if (row) {
            return res.status(409).send('Appointment already exists at this time.');
        }

        db.run('INSERT INTO approved_appointments (first_name, last_name, email, date, time, assigned_doctor, status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
            [name, surname, email, date, time, doctor, status], function(err) {
                if (err) {
                    console.error('Error adding appointment to the database:', err);
                    return res.status(500).send('Error adding appointment to the database.');
                }
                res.status(201).send('Appointment created successfully.');
            });
    });
};

// API endpoint to register an appointment
app.post('/api/approved_appointments/register', registerAppointment);

// Start the server


app.put('/api/providers/:id', (req, res) => {
    const providerId = req.params.id;
    const { availability } = req.body;

    db.run('UPDATE providers SET availability = ? WHERE id = ?', [availability, providerId], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Failed to update availability' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Provider not found' });
        }
        res.json({ message: 'Availability updated successfully' });
    });
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});