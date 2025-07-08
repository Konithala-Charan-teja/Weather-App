const apiKey = "a555048ec3655c2d85bab8cd15bdb7cb"; 
const OPEN_CAGE_API_KEY = "3bbc29f49eaf490982b92434194c4185";


const stateSelect = document.getElementById("state-select");
const districtSelect = document.getElementById("district-select");
const citySelect = document.getElementById("city-select");

let locationData = {}; 

// 1. Fetch and transform deep JSON to a usable format
fetch("data.json")
  .then((res) => res.json())
  .then((rawData) => {
    locationData = convertDeepToNested(rawData);
    populateStates();
  })
  .catch((err) => console.error("Error loading data:", err));

// 2. Transform deep nested array to state → district → city array
function convertDeepToNested(array) {
  const result = {};

  array.forEach((stateObj) => {
    const state = stateObj.state;
    result[state] = {};

    stateObj.districts.forEach((districtObj) => {
      const district = districtObj.district;
      result[state][district] = [];

      districtObj.subDistricts.forEach((subDist) => {
        if (!result[state][district].includes(subDist.subDistrict)) {
          result[state][district].push(subDist.subDistrict);
        }
      });
    });
  });

  return result;
}

// 3. Populate state dropdown
function populateStates() {
  stateSelect.innerHTML = `<option value="">Select State</option>`;
  for (const state in locationData) {
    stateSelect.appendChild(new Option(state, state));
  }
}

// 4. Populate district dropdown when state changes
stateSelect.addEventListener("change", () => {
  const state = stateSelect.value;
  districtSelect.innerHTML = `<option value="">Select District</option>`;
  citySelect.innerHTML = `<option value="">Select City</option>`;
  citySelect.disabled = true;

  const districts = locationData[state];
  if (districts) {
    districtSelect.disabled = false;
    for (const district in districts) {
      districtSelect.appendChild(new Option(district, district));
    }
  } else {
    districtSelect.disabled = true;
  }
});

// 5. Populate cities (sub-districts) when district changes
districtSelect.addEventListener("change", () => {
  const state = stateSelect.value;
  const district = districtSelect.value;
  const cities = locationData[state]?.[district] || [];

  citySelect.innerHTML = `<option value="">Select City</option>`;

  if (cities.length > 0) {
    citySelect.disabled = false;
    cities.forEach((city) => {
      citySelect.appendChild(new Option(city, city));
    });
  } else {
    citySelect.disabled = true;
  }
});

// --- Weather Search by Selected City ---
document.getElementById("search-btn").addEventListener("click", () => {
  const city = citySelect.value.trim();
  if (!city) {
    alert("Please select a city.");
    return;
  }
  fetchWeather(city);
});

// --- Weather Search by Current Location ---
document.getElementById("location-btn").addEventListener("click", () => {
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      position => {
        const { latitude, longitude } = position.coords;
        fetchWeatherByCoords(latitude, longitude);
      },
      error => {
        alert("Location access denied or unavailable.");
      }
    );
  } else {
    alert("Geolocation is not supported in your browser.");
  }
});

// --- Fetch weather by city name ---
async function fetchWeather(city) {
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},IN&appid=${apiKey}&units=metric`;


  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`City not found: ${city}`);
    }

    const data = await response.json();
    updateWeatherUI(data);
  } catch (error) {
    console.error("Fetch error:", error);
    alert("Could not fetch weather. " + error.message);
  }
}



// --- Fetch weather by GPS coordinates ---




async function fetchWeatherByCoords(lat, lon) {
  try {
    //1. Reverse geocode using OpenCage
    const geoUrl = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lon}&key=${OPEN_CAGE_API_KEY}`;
    const geoRes = await fetch(geoUrl);
    const geoData = await geoRes.json();

    if (!geoData.results.length) {
      throw new Error("Location details not found.");
    }

    const comp = geoData.results[0].components;

    // Try best match for small towns/villages
    const city =
      comp.village ||
      comp.town ||
      comp.suburb ||
      comp.hamlet ||
      comp.city ||
      comp.county ||
      "Unknown Area";

    const state = comp.state || "Unknown State";

    const fullLocationName = `${city}, ${state}`;

    // 2. Fetch weather using lat/lon
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    const weatherRes = await fetch(weatherUrl);

    if (!weatherRes.ok) {
      throw new Error("Weather data not found.");
    }

    const weatherData = await weatherRes.json();

    // 3. Inject better location name
    weatherData.customLocation = fullLocationName;

    // 4. Update the UI
    updateWeatherUI(weatherData);
  } catch (error) {
    console.error("Fetch error:", error);
    alert("Could not fetch weather by location. " + error.message);
  }
};


// --- Update DOM with weather data ---
function updateWeatherUI(data) {
  document.getElementById("location-name").innerText = `${data.name}, ${data.sys.country}`;
  document.getElementById("current-temp").innerText = Math.round(data.main.temp);
  document.getElementById("feels-like").innerText = Math.round(data.main.feels_like);
  document.getElementById("humidity").innerText = data.main.humidity;
  document.getElementById("wind-speed").innerText = data.wind.speed;
  document.getElementById("clouds").innerText = data.clouds.all;
  document.getElementById("weather-desc").innerText = data.weather[0].description;
  document.getElementById("weather-icon").src = `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
}

