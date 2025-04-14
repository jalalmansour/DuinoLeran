import React, { useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface SettingsSectionProps {
  darkMode: boolean;
  onDarkModeToggle: () => void;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ darkMode, onDarkModeToggle }) => {
  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (userId) {
      // Example: Fetch settings from the server, passing the user ID
      const fetchSettings = async () => {
        try {
          const response = await fetch('/api/settings', {
            headers: {
              'x-user-id': userId,
              // Add other headers as needed
            },
          });
          // Handle the response here
        } catch (error) {
          console.error('Error fetching settings:', error);
        }
      };
      fetchSettings();
    }
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <CardDescription>Customize application preferences.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="flex items-center space-x-2">
          <div className="space-y-0.5">
            <Label htmlFor="dark-mode">Dark Mode</Label>
            <p className="text-sm text-muted-foreground">Toggle between light and dark themes.</p>
          </div>
          <Switch
            id="dark-mode"
            checked={darkMode}
            onCheckedChange={onDarkModeToggle}
            aria-label="Toggle dark mode"
          />
        </div>
        {/* Add more settings here as needed */}
      </CardContent>
    </Card>
  );
};

export default SettingsSection;