"use client";

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Settings,
  Download,
  Upload,
  Save,
  RotateCcw,
  Trash2,
  CheckCircle
} from 'lucide-react';
import { AppSettings } from '@/types';
import { ROUTE_CONFIG } from '@/lib/constants';
import { toast } from 'sonner';

interface SettingsManagerProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
  className?: string;
}

interface SavedSettings {
  name: string;
  settings: AppSettings;
  createdAt: string;
}

const STORAGE_KEY = 'forecaster_saved_settings';

export function SettingsManager({ settings, onSettingsChange, className }: SettingsManagerProps) {
  const [savedSettings, setSavedSettings] = useState<SavedSettings[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });
  
  const [settingsName, setSettingsName] = useState('');
  const [autoSave, setAutoSave] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('forecaster_auto_save') === 'true';
    }
    return false;
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveSettingsToStorage = (newSavedSettings: SavedSettings[]) => {
    setSavedSettings(newSavedSettings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSavedSettings));
  };

  const handleSaveSettings = () => {
    if (!settingsName.trim()) {
      toast.error('Please enter a name for your settings');
      return;
    }

    const newSetting: SavedSettings = {
      name: settingsName.trim(),
      settings: { ...settings },
      createdAt: new Date().toISOString(),
    };

    const existingIndex = savedSettings.findIndex(s => s.name === newSetting.name);
    let newSavedSettings: SavedSettings[];

    if (existingIndex >= 0) {
      newSavedSettings = [...savedSettings];
      newSavedSettings[existingIndex] = newSetting;
      toast.success(`Settings "${newSetting.name}" updated`);
    } else {
      newSavedSettings = [...savedSettings, newSetting];
      toast.success(`Settings "${newSetting.name}" saved`);
    }

    saveSettingsToStorage(newSavedSettings);
    setSettingsName('');
  };

  const handleLoadSettings = (savedSetting: SavedSettings) => {
    // Convert string dates back to Date objects
    const loadedSettings = {
      ...savedSetting.settings,
      startTime: new Date(savedSetting.settings.startTime),
    };
    
    onSettingsChange(loadedSettings);
    toast.success(`Settings "${savedSetting.name}" loaded`);
  };

  const handleDeleteSettings = (name: string) => {
    const newSavedSettings = savedSettings.filter(s => s.name !== name);
    saveSettingsToStorage(newSavedSettings);
    toast.success(`Settings "${name}" deleted`);
  };

  const handleExportSettings = () => {
    const exportData = {
      settings,
      savedSettings,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forecaster_settings_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Settings exported successfully');
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importData = JSON.parse(e.target?.result as string);
        
        if (importData.settings) {
          const importedSettings = {
            ...importData.settings,
            startTime: new Date(importData.settings.startTime),
          };
          onSettingsChange(importedSettings);
        }

        if (importData.savedSettings && Array.isArray(importData.savedSettings)) {
          const mergedSettings = [...savedSettings];
          
          importData.savedSettings.forEach((imported: SavedSettings) => {
            const existingIndex = mergedSettings.findIndex(s => s.name === imported.name);
            if (existingIndex >= 0) {
              mergedSettings[existingIndex] = imported;
            } else {
              mergedSettings.push(imported);
            }
          });
          
          saveSettingsToStorage(mergedSettings);
        }

        toast.success('Settings imported successfully');
      } catch (error) {
        console.error('Import error:', error);
        toast.error('Failed to import settings. Please check the file format.');
      }
    };

    reader.readAsText(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleResetToDefaults = () => {
    const defaultSettings: AppSettings = {
      startTime: new Date(Date.now() + 60 * 60 * 1000),
      averageSpeed: ROUTE_CONFIG.DEFAULT_SPEED,
      forecastInterval: ROUTE_CONFIG.DEFAULT_INTERVAL,
      units: 'metric',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    onSettingsChange(defaultSettings);
    toast.success('Settings reset to defaults');
  };

  const handleAutoSaveToggle = (enabled: boolean) => {
    setAutoSave(enabled);
    localStorage.setItem('forecaster_auto_save', enabled.toString());
    
    if (enabled) {
      toast.success('Auto-save enabled');
    } else {
      toast.success('Auto-save disabled');
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Settings Manager
        </CardTitle>
        <CardDescription>
          Save, load, and manage your forecast settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Auto-save Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="auto-save" className="text-sm">
            Auto-save settings
          </Label>
          <Switch
            id="auto-save"
            checked={autoSave}
            onCheckedChange={handleAutoSaveToggle}
          />
        </div>

        {/* Save Current Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Save Current Settings</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter settings name..."
              value={settingsName}
              onChange={(e) => setSettingsName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveSettings()}
            />
            <Button onClick={handleSaveSettings} size="sm">
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Saved Settings List */}
        {savedSettings.length > 0 && (
          <div className="space-y-3">
            <Label className="text-sm font-medium">Saved Settings</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {savedSettings.map((saved) => (
                <div
                  key={saved.name}
                  className="flex items-center justify-between p-3 border rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{saved.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(saved.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLoadSettings(saved)}
                      className="h-8 w-8 p-0"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSettings(saved.name)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Import/Export */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Import/Export</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleExportSettings}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportSettings}
            className="hidden"
            aria-label="Import settings file"
          />
        </div>

        {/* Reset to Defaults */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleResetToDefaults}
            className="w-full flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>

        {/* Settings Summary */}
        <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
          <div className="flex justify-between">
            <span>Saved Settings:</span>
            <span>{savedSettings.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Auto-save:</span>
            <span>{autoSave ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex justify-between">
            <span>Current Speed:</span>
            <span>{settings.averageSpeed} km/h</span>
          </div>
          <div className="flex justify-between">
            <span>Current Interval:</span>
            <span>{settings.forecastInterval} km</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
