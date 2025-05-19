/**
 * Master list functionality
 */

// Check if an employee ID is on the master list
async function checkMasterList(employeeId) {
  try {
    const response = await fetch(`/api/master-list/check/${employeeId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.isOnList;
  } catch (error) {
    console.error("Error checking master list:", error);
    return false;
  }
}

// Upload a new master list
async function uploadMasterList(employeeIds) {
  try {
    const response = await fetch('/api/master-list/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ employeeIds }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload master list');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error uploading master list:", error);
    throw error;
  }
}

// Get the current master list
async function getMasterList(activeOnly = true) {
  try {
    const response = await fetch(`/api/master-list?activeOnly=${activeOnly}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to get master list');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error getting master list:", error);
    throw error;
  }
}