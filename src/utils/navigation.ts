import { router } from 'expo-router';

// Function to navigate to the appropriate dashboard based on user role
export const navigateToDashboard = (role: string | null) => {
  console.log('Navigating to dashboard for role:', role);
  
  if (!role) {
    console.log('No role detected, navigating to login');
    // If no role, navigate to login
    router.replace({ pathname: "/login" });
    return;
  }
  
  try {
    switch (role.toLowerCase()) {
      case 'owner':
        console.log('Navigating to owner dashboard');
        router.replace({ pathname: "/owner" });
        break;
      case 'staff':
        console.log('Navigating to staff dashboard');
        router.replace({ pathname: "/staff" });
        break;
      case 'officer':
        console.log('Navigating to officer dashboard');
        router.replace({ pathname: "/officer" });
        break;
      default:
        console.log('Unknown role, navigating to login');
        // If unknown role, navigate to login
        router.replace({ pathname: "/login" });
    }
  } catch (error) {
    console.error('Error during navigation:', error);
    // Fallback to login on error
    router.replace({ pathname: "/login" });
  }
}; 