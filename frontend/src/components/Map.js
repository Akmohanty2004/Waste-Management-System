import React, { useState, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow, Circle } from '@react-google-maps/api';
import { useGoogleMaps } from '../contexts/GoogleMapsContext';
import './Map.css';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  minHeight: '400px'
};

const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629
};

const Map = ({ reports, onMarkerClick, selectedReport, onLocationClick }) => {
  const { isLoaded, map, onLoad, onUnmount } = useGoogleMaps();
  const [center, setCenter] = useState(defaultCenter);
  const [zoom, setZoom] = useState(5);
  const [infoWindowOpen, setInfoWindowOpen] = useState(null);

  useEffect(() => {
    if (selectedReport?.location) {
      setCenter({
        lat: selectedReport.location.lat,
        lng: selectedReport.location.lng
      });
      setZoom(15);
    }
  }, [selectedReport]);

  const handleMarkerClick = (report) => {
    setInfoWindowOpen(report);
    if (onMarkerClick) {
      onMarkerClick(report);
    }
  };

  const handleMapClick = (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    if (onLocationClick) {
      onLocationClick({ lat, lng });
    }
  };

  const getMarkerColor = (status) => {
    switch(status) {
      case 'pending':
        return 'red';
      case 'accepted':
        return 'orange';
      case 'in-progress':
        return 'blue';
      case 'completed':
        return 'green';
      default:
        return 'red';
    }
  };

  if (!isLoaded) return <div className="map-loading">Loading Map...</div>;

  return (
    <div className="map-container">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          zoomControl: true,
          streetViewControl: true,
          mapTypeControl: true,
          fullscreenControl: true
        }}
      >
        {reports && reports.map((report) => (
          <Marker
            key={report._id}
            position={{
              lat: report.location.lat,
              lng: report.location.lng
            }}
            onClick={() => handleMarkerClick(report)}
            icon={{
              url: `http://maps.google.com/mapfiles/ms/icons/${getMarkerColor(report.status)}-dot.png`,
              scaledSize: new window.google.maps.Size(40, 40)
            }}
          />
        ))}

        {infoWindowOpen && (
          <InfoWindow
            position={{
              lat: infoWindowOpen.location.lat,
              lng: infoWindowOpen.location.lng
            }}
            onCloseClick={() => setInfoWindowOpen(null)}
          >
            <div className="info-window">
              <h4>Waste Report</h4>
              <p><strong>Status:</strong> {infoWindowOpen.status}</p>
              <p><strong>Reward:</strong> ₹{infoWindowOpen.paymentAmount}</p>
              <p><strong>Type:</strong> {infoWindowOpen.wasteType}</p>
              <p>{infoWindowOpen.description.substring(0, 100)}...</p>
              {infoWindowOpen.imageUrl && (
                <img src={infoWindowOpen.imageUrl} alt="Waste" className="info-window-image" />
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
};

export default Map;