let map;
let userMarker;
let amenityMarkers = [];
let reportMarkers = [];

function initMap() {
    map = L.map('map').setView([40.7128, -74.0060], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    setupEventListeners();
    loadExistingReports();
    loadNearbyAmenities(map.getCenter()); // Load amenities on initial map load
}

function setupEventListeners() {
    document.getElementById('locate').addEventListener('click', locateUser);
    document.getElementById('report').addEventListener('click', showReportModal);
    document.getElementById('cancel-report').addEventListener('click', hideReportModal);
    document.getElementById('report-form').addEventListener('submit', submitReport);
    map.on('moveend', onMapMove);
}

function onMapMove() {
    console.log('Map moved to:', map.getCenter());
    loadNearbyAmenities(map.getCenter());
}

function locateUser() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const userLocation = [position.coords.latitude, position.coords.longitude];
                
                if (userMarker) {
                    map.removeLayer(userMarker);
                }
                
                userMarker = L.marker(userLocation)
                    .addTo(map)
                    .bindPopup('You are here')
                    .openPopup();
                
                map.setView(userLocation, 16);
                loadNearbyAmenities(userLocation);
            },
            (error) => {
                alert('Location access denied or unavailable');
            }
        );
    }
}

function loadNearbyAmenities(location) {
    // Extract lat/lng from Leaflet object
    const lat = location.lat;
    const lng = location.lng;
    
    if (!lat || !lng || lat === undefined || lng === undefined) {
        console.log('Invalid location, skipping');
        return;
    }

    console.log('Loading amenities for:', lat, lng);
    
    clearAmenityMarkers();
    
    const radius = 1000;
    
    fetch(`/api/amenities?lat=${lat}&lon=${lng}&radius=${radius}`)
        .then(response => {
            console.log('API response status:', response.status);
            return response.json();
        })
        .then(amenities => {
            console.log('Found', amenities.length, 'amenities');
            amenities.forEach(amenity => {
                const amenityLat = amenity.lat || (amenity.center && amenity.center.lat);
                const amenityLon = amenity.lon || (amenity.center && amenity.center.lon);
                
                if (amenityLat && amenityLon) {
                    const wheelchair = amenity.tags.wheelchair;
                    let iconColor = 'gray';
                    
                    if (wheelchair === 'yes') iconColor = 'green';
                    if (wheelchair === 'no') iconColor = 'red';
                    
                    const marker = L.marker([amenityLat, amenityLon], {
                        icon: L.divIcon({
                            className: `amenity-marker ${wheelchair}`,
                            html: `<div style="background: ${iconColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                            iconSize: [16, 16]
                        })
                    }).addTo(map);
                    
                    const name = amenity.tags.name || 'Unnamed Venue';
                    const type = amenity.tags.amenity || 'Unknown';
                    
                    marker.bindPopup(`
                        <strong>${name}</strong><br>
                        Type: ${type}<br>
                        Wheelchair: ${wheelchair || 'unknown'}
                    `);
                    
                    amenityMarkers.push(marker);
                }
            });
        })
        .catch(error => {
            console.error('Error loading amenities:', error);
        });
}

function clearAmenityMarkers() {
    amenityMarkers.forEach(marker => map.removeLayer(marker));
    amenityMarkers = [];
}

function showReportModal() {
    const center = map.getCenter();
    document.getElementById('report-lat').value = center.lat;
    document.getElementById('report-lon').value = center.lng;
    document.getElementById('report-modal').style.display = 'block';
}

function hideReportModal() {
    document.getElementById('report-modal').style.display = 'none';
    document.getElementById('report-form').reset();
}

function submitReport(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const reportData = {
        lat: parseFloat(formData.get('lat')),
        lon: parseFloat(formData.get('lon')),
        issue_type: formData.get('issue_type'),
        description: formData.get('description')
    };
    
    fetch('/api/reports', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            alert('Report submitted successfully!');
            hideReportModal();
            addReportMarker(reportData);
        }
    })
    .catch(error => {
        alert('Error submitting report');
        console.error('Error:', error);
    });
}

function loadExistingReports() {
    fetch('/api/reports')
        .then(response => response.json())
        .then(reports => {
            reports.forEach(report => {
                addReportMarker(report);
            });
        });
}

function addReportMarker(report) {
    const marker = L.marker([report.lat, report.lon], {
        icon: L.divIcon({
            className: 'report-marker',
            html: '⚠️',
            iconSize: [20, 20]
        })
    }).addTo(map);
    
    marker.bindPopup(`
        <strong>Accessibility Issue</strong><br>
        Type: ${report.issue_type}<br>
        ${report.description ? `Details: ${report.description}` : ''}
    `);
    
    reportMarkers.push(marker);
}

document.addEventListener('DOMContentLoaded', initMap);