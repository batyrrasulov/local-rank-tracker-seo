const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const app = express();
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('MongoDB connected successfully');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

app.use(cors({
  origin: 'http://localhost:3000', // Adjust this to your frontend's URL
}));
app.use(express.json());
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

app.get('/suggestions', async (req, res) => {
  const query = req.query.query;
  console.log('Query received:', query); // Log received query

  if (!query) {
      return res.status(400).json({ error: 'Query parameter is missing' });
  }

  try {
      // Make request to Google Places API
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
          params: {
              input: query,
              key: GOOGLE_API_KEY,
              types: 'establishment'
          }
      });
      
      console.log('Google API Response:', response.data); // Log Google API response

      // Ensure Google API returns predictions
      if (response.data.status === 'OK' && Array.isArray(response.data.predictions)) {
          // Map the predictions to format { description, place_id }
          const predictions = response.data.predictions.map(prediction => ({
              description: prediction.description,
              place_id: prediction.place_id
          }));

          // Send back structured response
          return res.json({
              status: 'OK',
              predictions: predictions
          });
      } else {
        console.log('No results found'); // Log when no results found
          // No results found
          return res.json({
              status: 'ZERO_RESULTS',
              predictions: []
          });
      }
  } catch (error) {
      console.error('Error fetching suggestions from Google Places API:', error.message);
      return res.status(500).json({ error: 'Error fetching suggestions' });
  }
});

app.get('/place-details', async (req, res) => {
  const placeId = req.query.place_id; // Fetch the place_id from query parameters
  
  try {
      const response = await axios.get(`https://maps.googleapis.com/maps/api/place/details/json`, {
          params: {
              place_id: placeId,
              key: GOOGLE_API_KEY,
              fields: 'name,geometry,formatted_address,place_id,rating'  // Adjust fields to avoid extra costs
          }
      });
      if (response.data.status === 'OK') {
            res.json({ status: 'OK', result: response.data.result });
        } else {
            res.status(404).json({ status: 'NOT_FOUND', error: 'Place not found' });
        }
  } catch (error) {
      console.error('Error fetching place details:', error);
      res.status(500).json({ error: 'Error fetching place details.' });
  }
});
app.get('/keyword-search', async (req, res) => {
  const keyword = req.query.keyword;
  const location = req.query.location;
  const radius = req.query.radius;

  if (!keyword || !location || !radius) {
      return res.status(400).json({ error: 'Keyword, location, and radius are required' });
  }
  const radiusValue = parseFloat(radius) * 1000; // Convert to meters if needed
  console.log('Using radius in meters for keyword search:', radiusValue);

  try {
      const searchResults = await fetchPlaces({ keyword, location, radius: radiusValue });
      return res.json({ status: 'OK', results: searchResults });
  } catch (error) {
      console.error('Error performing keyword search:', error.message);
      return res.status(500).json({ error: 'Error fetching search results' });
  }
});

// Endpoint to get business details
app.get('/businessDetails', async (req, res) => {
  const businessId = req.query.businessId;
  const radius = req.query.radius; // Get radius from request

  if (!businessId || !radius) {
    return res.status(400).json({ error: 'Business ID and radius are required' });
  }

  console.log('Received request for business details:', businessId);

  try {
      const response = await axios.get(`https://maps.googleapis.com/maps/api/place/details/json`, {
          params: {
              place_id: businessId,
              key: GOOGLE_API_KEY
          }
      });
      console.log('Google API Response:', response.data); // Log the full response

      const placeDetails = response.data.result;

      if (placeDetails && placeDetails.geometry) {
          const businessInfo = {
              name: placeDetails.name || 'No name available',
              address: placeDetails.formatted_address || 'No address available',
              rating: placeDetails.rating || 'No rating available',
              location: placeDetails.geometry.location // Get the coordinates for nearby search

          };
          // Fetch nearby businesses
    const nearbyBusinesses = await fetchPlaces({
      location: `${businessInfo.location.lat},${businessInfo.location.lng}`,
      radius: parseFloat(radius) * 1000 // Adjust the radius as needed
  });

  res.json({ businessInfo, nearbyBusinesses });  // Send back the business details as JSON
      } else {
          res.status(404).json({ error: 'Business not found' });
      }
  } catch (error) {
      console.error('Error fetching business details:', error);
      res.status(500).json({ error: 'Failed to fetch business details' });
  }
});

// Function to fetch places using Google Places API
async function fetchPlaces(params) {
  const url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
  const apiKey = process.env.GOOGLE_API_KEY;

  // Helper function for trying multiple keyword variations
  async function trySearchWithKeywords(keywords) {
    for (const keyword of keywords) {
      try {
        console.log(`Searching with keyword: ${keyword}`);
        const response = await axios.get(url, {
          params: {
            location: params.location,
            radius: params.radius,
            keyword: keyword,
            rankby: params.rankby || 'prominence',
            key: apiKey,
          }
        });
        // Log the complete response for debugging
        console.log('Google API Response:', response.data);

        if (response.data.status === 'OK' && response.data.results.length > 0) {
          return response.data.results;
        } else {
          console.warn(`No results with keyword: ${keyword}. Status: ${response.data.status}`);
        }
      } catch (err) {
        console.error(`Error with keyword "${keyword}":`, err);
      }
    }
    return [];
  }

  try {
    // Split the keyword into individual words
    const keywords = [params.keyword, ...params.keyword.split(' ')];

    const results = await trySearchWithKeywords(keywords);

    // Map results for consistent formatting
    const places = results
      .filter(place => place.geometry && place.geometry.location)
      .map((place, index) => ({
        place_id: place.place_id,
        name: place.name,
        address: place.vicinity,
        rank: index + 1,
        location: place.geometry.location,
      }));

    return places;
  } catch (error) {
    console.error('Error in fetchPlaces:', error.message);
    throw new Error('Error fetching data from Google Places API');
  }
}

// Function to determine color based on rank
function getRankColor(rank) {
  if (rank >= 5) return 'green';      // Example for high rating
  if (rank >= 10) return 'yellow';     // Example for medium rating
  if (rank > 20) return 'red';         // Example for low rating
  return 'lightgray';                  // No rating
}
// Route for fetching rankings based on location and keyword
app.get('/rankings', async (req, res) => {
  const { location, radius, keyword } = req.query;
  console.log('Received parameters:', { location, radius, keyword });

  if (!location || !radius || !keyword) {
      return res.status(400).json({ error: 'Location, radius, and keyword are required' });
  }

  const radiusValue = parseFloat(radius) * 1000;
if (isNaN(radiusValue) || radiusValue <= 0) {
    return res.status(400).json({ error: 'Radius must be a positive number' });
}

  try {
      const places = await fetchPlaces({ location, radius: radiusValue, keyword});
      console.log('Fetched Places:', places);

      if (places.length === 0) {
        return res.status(404).json({ error: 'No places found for the given criteria' });
    }

      const uniquePlaces = new Map();
        places.forEach((place) => {
            if (!uniquePlaces.has(place.name)) {
                uniquePlaces.set(place.name, {
                    business: place.name,
                    address: place.address,
                    location: place.location,
                    place_id: place.place_id,
                    rank: uniquePlaces.size + 1, // Increment rank based on unique places
                    color: getRankColor(uniquePlaces.size + 1)
                });
            }
        });

      // Convert the Map back to an array
      const formattedPlaces = Array.from(uniquePlaces.values());

  res.json(formattedPlaces);
  } catch (error) {
      console.error('Error fetching rankings:', error);
      res.status(500).send(error.message);
  }
});

// Route for generating a grid of points and fetching rank data
app.get('/grid', async (req, res) => {
  const { lat, lng, gridSize, keyword } = req.query;
  const distance = 0.01; // Distance between grid points in degrees

  function generateGrid(center, gridSize, distance) {
    const points = [];
    const latStep = distance / 111.32; // Approx degree distance for latitude
    const lngStep = distance / (111.32 * Math.cos(center.lat * Math.PI / 180)); // Adjust for longitude

    for (let i = -gridSize; i <= gridSize; i++) {
      for (let j = -gridSize; j <= gridSize; j++) {
        points.push({
          lat: center.lat + i * latStep,
          lng: center.lng + j * lngStep,
        });
      }
    }
    return points;
  }

  try {
    const center = { lat: parseFloat(lat), lng: parseFloat(lng) };
    const gridPoints = generateGrid(center, parseInt(gridSize), distance);

    // Use a Set to avoid duplicate API requests
    const uniqueLocations = new Set();
    const rankDataPromises = [];

    for (const point of gridPoints) {
      const locationKey = `${point.lat},${point.lng}`;
      if (!uniqueLocations.has(locationKey)) {
        uniqueLocations.add(locationKey);
        rankDataPromises.push(fetchPlaces({ location: locationKey, radius: parseFloat(radius) * 1000, keyword }));
      }
    }

    // Await all rank data promises at once
    const results = await Promise.all(rankDataPromises);

    // Format the results into a structured response
    const formattedResults = gridPoints.map((point, index) => {
      const ranks = results[index] || [];
      return {
        location: point,
        ranks: ranks.map(business => ({
          place_id: business.place_id,
          name: business.name,
          rank: business.rank,
          color: getRankColor(business.rank)
        }))
      };
    });

    res.json({ grid: gridPoints, ranks: formattedResults });
  } catch (error) {
    console.error('Error generating grid:', error);
    res.status(500).json({ error: 'Error generating grid' });
  }
});

// Serve the HTML files for the routes
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/resetpw', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'resetpw.html'));
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// User Registration
app.post('/register', async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

  if (!username || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'All fields are required' });
}
// Check if passwords match
if (password !== confirmPassword) {
  return res.status(400).json({ message: 'Passwords do not match' });
}

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists.' });
    }

    const user = await User.create({
      username,
      email,
      password, // password will be hashed due to pre-save hook in the model
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.status(201).json({ message: 'User registered successfully.', token });
  } catch (error) {
    console.error('Error during registration:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
});

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Extract token from the 'Authorization' header
  if (!token) {
      return res.status(403).send("Token is required for authentication");
  }

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use the environment variable here
      console.log("Decoded Token:", decoded); // Debugging output
      req.user = decoded; // Attach decoded user to request object
      next();
  } catch (err) {
      console.error("Token verification failed:", err);
      return res.status(401).send("Invalid token");
  }
};


app.delete('/delete-account', verifyToken, async (req, res) => {
  console.log("User ID:", req.user?.id); // Use optional chaining to prevent errors if req.user is undefined

  try {
      const userId = req.user?.id; // Ensure userId is correctly accessed
      if (!userId) {
          return res.status(400).send("User ID is required.");
      }

      const user = await User.findByIdAndDelete(userId);

      if (!user) {
          return res.status(404).send("User not found.");
      }

      res.status(200).send("Account deleted successfully");
  } catch (err) {
      console.error("Error deleting account:", err);
      res.status(500).send("Error deleting account");
  }
});


// User Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
      const user = await User.findOne({ username });

      if (!user) {
          return res.status(404).json({ message: 'User not found' });
      }

      const isMatch = await user.matchPassword(password);

      if (!isMatch) {
          return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

      res.json({ message: 'Logged in successfully', token });
  } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error'});
  }
});

// Password Reset
app.post('/resetpw', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Here, you would send an email with a password reset link
    // This part is just a placeholder for email functionality
    res.json({ message: 'Password reset link has been sent to your email.' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).send('Server error');
  }
});

// Test route
app.get('/', (req, res) => {
  res.send('Local Rank Tracker Backend is running!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
