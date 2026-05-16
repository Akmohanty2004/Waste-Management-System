import React, { useState, useEffect } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import './LocationSearch.css';

const LocationSearch = ({ onLocationSelect, placeholder = "Search location..." }) => {
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  const {
    ready,
    value,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'in' }, // Restrict to India
      types: ['geocode', 'establishment']
    },
    debounce: 300,
  });

  const handleInput = (e) => {
    setValue(e.target.value);
  };

  const handleSelect = async (address) => {
    setValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = await getLatLng(results[0]);
      const formattedAddress = results[0].formatted_address;
      
      const locationData = {
        lat,
        lng,
        address: formattedAddress,
        placeId: results[0].place_id
      };
      
      setSelectedLocation(locationData);
      onLocationSelect(locationData);
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          // Reverse geocode to get address
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            const address = data.results[0]?.formatted_address || `${lat}, ${lng}`;
            
            const locationData = { lat, lng, address };
            setSelectedLocation(locationData);
            setValue(address, false);
            onLocationSelect(locationData);
          } catch (error) {
            console.error('Error getting address:', error);
            const locationData = { lat, lng, address: `${lat}, ${lng}` };
            setSelectedLocation(locationData);
            onLocationSelect(locationData);
          }
        },
        (error) => {
          console.error('Error getting location:', error);
          alert('Error getting your location. Please allow location access.');
        }
      );
    } else {
      alert('Geolocation is not supported by your browser');
    }
  };

  return (
    <div className="location-search">
      <div className="search-container">
        <input
          value={value}
          onChange={handleInput}
          disabled={!ready}
          placeholder={placeholder}
          className="location-input"
        />
        <button 
          onClick={getCurrentLocation}
          className="current-location-btn"
          type="button"
          title="Use my current location"
        >
          📍
        </button>
      </div>
      
      {status === 'OK' && (
        <ul className="suggestions-list">
          {data.map((suggestion) => (
            <li 
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion.description)}
              className="suggestion-item"
            >
              <span className="suggestion-icon">📍</span>
              {suggestion.description}
            </li>
          ))}
        </ul>
      )}
      
      {selectedLocation && (
        <div className="selected-location">
          <strong>Selected Location:</strong>
          <p>{selectedLocation.address}</p>
          <small>Lat: {selectedLocation.lat.toFixed(6)}, Lng: {selectedLocation.lng.toFixed(6)}</small>
        </div>
      )}
    </div>
  );
};

export default LocationSearch;