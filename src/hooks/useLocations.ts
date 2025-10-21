import { useState, useEffect } from "react";

interface Location {
  id: string;
  location_id: string;
  location_name: string;
  country?: string;
  region?: string;
  city?: string;
  address?: string;
  created_at: string;
  updated_at: string;
}

export function useLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      
      const data = await response.json();
      setLocations(data || []);
    } catch (err) {
      console.error('Error fetching locations:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getLocationName = (locationId: string): string => {
    const location = locations.find(l => l.location_id === locationId);
    return location?.location_name || `Ubicación ${locationId}`;
  };

  const getLocationUUID = (locationId: string): string | null => {
    const location = locations.find(l => l.location_id === locationId);
    return location?.id || null;
  };

  const getLocationByUUID = (uuid: string): Location | null => {
    return locations.find(l => l.id === uuid) || null;
  };

  const createLocation = async (locationData: Omit<Location, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(locationData),
      });

      if (!response.ok) throw new Error('Failed to create location');
      const newLocation = await response.json();
      setLocations(prev => [...prev, newLocation]);
      return newLocation;
    } catch (error) {
      console.error('Error creating location:', error);
      throw error;
    }
  };

  const updateLocation = async (id: string, updates: Partial<Location>) => {
    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update location');
      const updatedLocation = await response.json();
      setLocations(prev => prev.map(l => l.id === id ? updatedLocation : l));
      return updatedLocation;
    } catch (error) {
      console.error('Error updating location:', error);
      throw error;
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const response = await fetch(`/api/locations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete location');
      setLocations(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      console.error('Error deleting location:', error);
      throw error;
    }
  };

  return {
    locations,
    loading,
    error,
    getLocationName,
    getLocationUUID,
    getLocationByUUID,
    createLocation,
    updateLocation,
    deleteLocation,
    refetch: fetchLocations
  };
}