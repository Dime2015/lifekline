
export interface GeoLocation {
    city: string;
    lng: number;
    lat: number;
}

export const searchCityCoordinates = async (cityName: string): Promise<GeoLocation | null> => {
    if (!cityName.trim()) return null;

    try {
        // OpenStreetMap Nominatim API (Free, requires User-Agent)
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityName)}&limit=1`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'LifeKLineApp/1.0'
            }
        });

        if (!response.ok) return null;

        const data = await response.json();
        if (data && data.length > 0) {
            return {
                city: data[0].display_name,
                lng: parseFloat(data[0].lon),
                lat: parseFloat(data[0].lat)
            };
        }
        return null;
    } catch (error) {
        console.warn("Geocoding failed:", error);
        return null;
    }
};
