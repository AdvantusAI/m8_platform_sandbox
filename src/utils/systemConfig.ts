export const getSystemConfig = async (key: string): Promise<{ currentDate: string } | null> => {
  try {
    const response = await fetch(`http://localhost:3001/api/system-config?key=${key}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`System config not found for key: ${key}`);
        return null;
      }
      throw new Error(`Failed to fetch system config: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (key === 'system_date') {
      return { currentDate: data.currentDate || null };
    }

    // For other keys, return the value
    return { currentDate: data.value || null };
  } catch (error) {
    console.error(`Error fetching system config for key: ${key}`, error);
    return null;
  }
};

export const updateSystemConfig = async (key: string, value: any): Promise<boolean> => {
  try {
    const body: any = { key };
    
    if (key === 'system_date') {
      body.system_date = value;
    } else {
      body.value = value;
    }

    const response = await fetch('http://localhost:3001/api/system-config', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Failed to update system config: ${response.status} ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error(`Error updating system config for key: ${key}`, error);
    return false;
  }
};