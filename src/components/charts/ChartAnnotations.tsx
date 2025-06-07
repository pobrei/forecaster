"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  MapPin, 
  MessageSquare, 
  AlertTriangle, 
  Star, 
  Flag,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Zap
} from 'lucide-react';
import { WeatherForecast } from '@/types';
import { toast } from 'sonner';

interface Annotation {
  id: string;
  pointIndex: number;
  type: 'note' | 'warning' | 'highlight' | 'waypoint';
  title: string;
  description: string;
  color: string;
  createdAt: Date;
}

interface ChartAnnotationsProps {
  forecasts: WeatherForecast[];
  onAnnotationSelect?: (pointIndex: number) => void;
  className?: string;
}

const annotationTypes = [
  {
    value: 'note',
    label: 'Note',
    icon: MessageSquare,
    color: '#3b82f6',
    description: 'General observation or comment'
  },
  {
    value: 'warning',
    label: 'Warning',
    icon: AlertTriangle,
    color: '#ef4444',
    description: 'Important weather alert or caution'
  },
  {
    value: 'highlight',
    label: 'Highlight',
    icon: Star,
    color: '#f59e0b',
    description: 'Point of interest or notable condition'
  },
  {
    value: 'waypoint',
    label: 'Waypoint',
    icon: Flag,
    color: '#10b981',
    description: 'Navigation or route marker'
  }
];

export function ChartAnnotations({ 
  forecasts, 
  onAnnotationSelect,
  className 
}: ChartAnnotationsProps) {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAnnotation, setNewAnnotation] = useState({
    pointIndex: 0,
    type: 'note' as Annotation['type'],
    title: '',
    description: ''
  });

  const addAnnotation = useCallback(() => {
    if (!newAnnotation.title.trim()) {
      toast.error('Please enter a title for the annotation');
      return;
    }

    if (newAnnotation.pointIndex >= forecasts.length) {
      toast.error('Invalid point index');
      return;
    }

    const annotationType = annotationTypes.find(t => t.value === newAnnotation.type);
    const annotation: Annotation = {
      id: `annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pointIndex: newAnnotation.pointIndex,
      type: newAnnotation.type,
      title: newAnnotation.title.trim(),
      description: newAnnotation.description.trim(),
      color: annotationType?.color || '#3b82f6',
      createdAt: new Date()
    };

    setAnnotations(prev => [...prev, annotation]);
    setNewAnnotation({
      pointIndex: 0,
      type: 'note',
      title: '',
      description: ''
    });
    setIsAdding(false);
    
    toast.success('Annotation added successfully!');
  }, [newAnnotation, forecasts.length]);

  const updateAnnotation = useCallback((id: string, updates: Partial<Annotation>) => {
    setAnnotations(prev => prev.map(ann => 
      ann.id === id ? { ...ann, ...updates } : ann
    ));
    setEditingId(null);
    toast.success('Annotation updated successfully!');
  }, []);

  const deleteAnnotation = useCallback((id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    toast.success('Annotation deleted successfully!');
  }, []);

  const getPointInfo = (pointIndex: number) => {
    const forecast = forecasts[pointIndex];
    if (!forecast) return null;
    
    return {
      distance: forecast.routePoint.distance.toFixed(1),
      temperature: forecast.weather.temp.toFixed(1),
      conditions: `${forecast.weather.temp.toFixed(1)}°, ${forecast.weather.humidity}% humidity`
    };
  };

  const handlePointSelect = (pointIndex: number) => {
    onAnnotationSelect?.(pointIndex);
  };

  const exportAnnotations = () => {
    const exportData = {
      annotations,
      exportedAt: new Date().toISOString(),
      totalAnnotations: annotations.length,
      routePoints: forecasts.length
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chart-annotations-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Annotations exported successfully!');
  };

  const importAnnotations = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.annotations && Array.isArray(data.annotations)) {
          setAnnotations(data.annotations.map((ann: any) => ({
            ...ann,
            createdAt: new Date(ann.createdAt)
          })));
          toast.success(`Imported ${data.annotations.length} annotations!`);
        } else {
          toast.error('Invalid annotation file format');
        }
      } catch (error) {
        toast.error('Failed to import annotations');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Chart Annotations
          <Badge variant="default" className="text-xs bg-gradient-to-r from-primary to-primary/80">
            PRO
          </Badge>
        </CardTitle>
        <CardDescription>
          Add custom markers, notes, and highlights to your weather charts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Annotation */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Annotations ({annotations.length})</h4>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAdding(!isAdding)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
              {annotations.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAnnotations}
                  >
                    Export
                  </Button>
                  <label className="cursor-pointer">
                    <Button variant="outline" size="sm" asChild>
                      <span>Import</span>
                    </Button>
                    <input
                      type="file"
                      accept=".json"
                      onChange={importAnnotations}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>
          </div>

          {isAdding && (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Point Index</label>
                  <Select
                    value={newAnnotation.pointIndex.toString()}
                    onValueChange={(value) =>
                      setNewAnnotation(prev => ({ ...prev, pointIndex: parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {forecasts.map((forecast, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          Point {index + 1} - {forecast.routePoint.distance.toFixed(1)}km
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select
                    value={newAnnotation.type}
                    onValueChange={(value: Annotation['type']) =>
                      setNewAnnotation(prev => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {annotationTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" style={{ color: type.color }} />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newAnnotation.title}
                  onChange={(e) =>
                    setNewAnnotation(prev => ({ ...prev, title: e.target.value }))
                  }
                  placeholder="Enter annotation title..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Textarea
                  value={newAnnotation.description}
                  onChange={(e) =>
                    setNewAnnotation(prev => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Enter detailed description..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={addAnnotation} size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsAdding(false)}
                  size="sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Annotations List */}
        <div className="space-y-3">
          {annotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No annotations yet</p>
              <p className="text-sm">Add markers and notes to highlight important points on your charts</p>
            </div>
          ) : (
            annotations.map((annotation) => {
              const annotationType = annotationTypes.find(t => t.value === annotation.type);
              const pointInfo = getPointInfo(annotation.pointIndex);
              const isEditing = editingId === annotation.id;

              return (
                <div
                  key={annotation.id}
                  className="p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {annotationType && (
                        <annotationType.icon
                          className="h-5 w-5 mt-0.5 shrink-0"
                          style={{ color: annotation.color }}
                        />
                      )}
                      <div className="flex-1 space-y-2">
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              defaultValue={annotation.title}
                              onBlur={(e) =>
                                updateAnnotation(annotation.id, { title: e.target.value })
                              }
                              className="font-medium"
                            />
                            <Textarea
                              defaultValue={annotation.description}
                              onBlur={(e) =>
                                updateAnnotation(annotation.id, { description: e.target.value })
                              }
                              rows={2}
                            />
                          </div>
                        ) : (
                          <>
                            <h5 className="font-medium">{annotation.title}</h5>
                            {annotation.description && (
                              <p className="text-sm text-muted-foreground">
                                {annotation.description}
                              </p>
                            )}
                          </>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Point {annotation.pointIndex + 1}</span>
                          {pointInfo && (
                            <>
                              <span>{pointInfo.distance}km</span>
                              <span>{pointInfo.temperature}°</span>
                              <span>{pointInfo.conditions}</span>
                            </>
                          )}
                          <span>{annotation.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePointSelect(annotation.pointIndex)}
                        className="h-8 w-8 p-0"
                      >
                        <MapPin className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingId(isEditing ? null : annotation.id)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAnnotation(annotation.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Summary */}
        {annotations.length > 0 && (
          <div className="p-3 bg-muted/20 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Summary</span>
              <div className="flex gap-4">
                {annotationTypes.map((type) => {
                  const count = annotations.filter(ann => ann.type === type.value).length;
                  if (count === 0) return null;
                  
                  return (
                    <div key={type.value} className="flex items-center gap-1">
                      <type.icon className="h-3 w-3" style={{ color: type.color }} />
                      <span>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
