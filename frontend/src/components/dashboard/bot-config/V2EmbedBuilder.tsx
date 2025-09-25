import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  TextField, 
  Select, 
  MenuItem, 
  Typography, 
  Paper,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  FormControl,
  InputLabel,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  Card,
  CardContent,
  Switch,
  FormControlLabel,
  Tooltip,
  Tab,
  Tabs,
  Snackbar
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Image as ImageIcon,
  TextFields as TextIcon,
  SmartButton as ButtonIcon,
  HorizontalRule as DividerIcon,
  ViewCarousel as CarouselIcon,
  Preview as PreviewIcon,
  Save as SaveIcon,
  Code as CodeIcon,
  ContentCopy as CopyIcon,
  Palette as PaletteIcon,
  ViewModule as ContainerIcon,
  DragIndicator as DragIcon
} from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface V2EmbedBuilderProps {
  commandName: string;
  embedData: any[];
  onSave: (data: any[]) => void;
  onClose: () => void;
}

const V2_COMPONENT_TYPES = {
  CONTAINER: 17,
  MEDIA_GALLERY: 12,
  TEXT: 10,
  DIVIDER: 14,
  ACTION_ROW: 1,
  BUTTON: 2
};

const TEXT_STYLES = [
  { value: 0, label: 'Default' },
  { value: 1, label: 'Small' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'Large' },
  { value: 4, label: 'Bold' },
  { value: 16, label: 'Italic' },
  { value: 20, label: 'Bold + Italic' }
];

const BUTTON_STYLES = [
  { value: 1, label: 'Primary (Blue)', color: '#5865F2' },
  { value: 2, label: 'Secondary (Gray)', color: '#4f545c' },
  { value: 3, label: 'Success (Green)', color: '#3ba55c' },
  { value: 4, label: 'Danger (Red)', color: '#ed4245' },
  { value: 5, label: 'Link (Gray)', color: '#5865F2' }
];

export default function V2EmbedBuilder({ commandName, embedData, onSave, onClose }: V2EmbedBuilderProps) {
  const [containers, setContainers] = useState<any[]>(embedData || []);
  const [activeTab, setActiveTab] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as any });

  // Templates for quick start
  const templates = {
    rules: {
      name: 'Server Rules',
      containers: [
        {
          id: 1,
          type: V2_COMPONENT_TYPES.CONTAINER,
          components: [
            { id: 100, type: V2_COMPONENT_TYPES.MEDIA_GALLERY, items: [{ url: 'https://example.com/banner.png', description: 'Rules Banner' }] },
            { id: 101, type: V2_COMPONENT_TYPES.TEXT, content: '# 📜 Server Rules', style: 3 },
            { id: 102, type: V2_COMPONENT_TYPES.DIVIDER },
            { id: 103, type: V2_COMPONENT_TYPES.TEXT, content: '1. **Be respectful** - Treat everyone with respect', style: 0 },
            { id: 104, type: V2_COMPONENT_TYPES.TEXT, content: '2. **No spam** - Avoid repetitive messages', style: 0 },
            { id: 105, type: V2_COMPONENT_TYPES.TEXT, content: '3. **Stay on topic** - Keep discussions relevant', style: 0 }
          ]
        }
      ]
    },
    welcome: {
      name: 'Welcome Message',
      containers: [
        {
          id: 1,
          type: V2_COMPONENT_TYPES.CONTAINER,
          components: [
            { id: 200, type: V2_COMPONENT_TYPES.MEDIA_GALLERY, items: [{ url: 'https://example.com/welcome.png', description: 'Welcome' }] },
            { id: 201, type: V2_COMPONENT_TYPES.TEXT, content: '# 🎉 Welcome to our Server!', style: 3 },
            { id: 202, type: V2_COMPONENT_TYPES.TEXT, content: 'We\'re glad to have you here!', style: 1 },
            {
              id: 203,
              type: V2_COMPONENT_TYPES.ACTION_ROW,
              components: [
                { id: 204, type: V2_COMPONENT_TYPES.BUTTON, style: 1, label: 'Rules', emoji: '📜', custom_id: 'rules_button' },
                { id: 205, type: V2_COMPONENT_TYPES.BUTTON, style: 5, label: 'Website', url: 'https://example.com' }
              ]
            }
          ]
        }
      ]
    },
    announcement: {
      name: 'Announcement',
      containers: [
        {
          id: 1,
          type: V2_COMPONENT_TYPES.CONTAINER,
          components: [
            { id: 300, type: V2_COMPONENT_TYPES.TEXT, content: '# 📢 Important Announcement', style: 3 },
            { id: 301, type: V2_COMPONENT_TYPES.DIVIDER },
            { id: 302, type: V2_COMPONENT_TYPES.TEXT, content: 'Your announcement text here...', style: 0 }
          ]
        }
      ]
    }
  };

  const addContainer = () => {
    const newContainer = {
      id: Date.now(),
      type: V2_COMPONENT_TYPES.CONTAINER,
      components: []
    };
    setContainers([...containers, newContainer]);
    setSelectedContainer(containers.length);
  };

  const deleteContainer = (index: number) => {
    const newContainers = containers.filter((_, i) => i !== index);
    setContainers(newContainers);
    if (selectedContainer === index) {
      setSelectedContainer(null);
    }
  };

  const addComponent = (containerIndex: number, type: number) => {
    const newComponent: any = {
      id: Date.now(),
      type
    };

    // Set default values based on component type
    switch (type) {
      case V2_COMPONENT_TYPES.TEXT:
        newComponent.content = 'New text content';
        newComponent.style = 0;
        break;
      case V2_COMPONENT_TYPES.MEDIA_GALLERY:
        newComponent.items = [{ url: '', description: '' }];
        break;
      case V2_COMPONENT_TYPES.ACTION_ROW:
        newComponent.components = [];
        break;
      case V2_COMPONENT_TYPES.BUTTON:
        newComponent.style = 1;
        newComponent.label = 'Button';
        break;
    }

    const newContainers = [...containers];
    newContainers[containerIndex].components.push(newComponent);
    setContainers(newContainers);
  };

  const updateComponent = (containerIndex: number, componentIndex: number, updates: any) => {
    const newContainers = [...containers];
    newContainers[containerIndex].components[componentIndex] = {
      ...newContainers[containerIndex].components[componentIndex],
      ...updates
    };
    setContainers(newContainers);
  };

  const deleteComponent = (containerIndex: number, componentIndex: number) => {
    const newContainers = [...containers];
    newContainers[containerIndex].components.splice(componentIndex, 1);
    setContainers(newContainers);
  };

  const addButtonToActionRow = (containerIndex: number, actionRowIndex: number) => {
    const newButton = {
      id: Date.now(),
      type: V2_COMPONENT_TYPES.BUTTON,
      style: 1,
      label: 'New Button'
    };

    const newContainers = [...containers];
    if (!newContainers[containerIndex].components[actionRowIndex].components) {
      newContainers[containerIndex].components[actionRowIndex].components = [];
    }
    newContainers[containerIndex].components[actionRowIndex].components.push(newButton);
    setContainers(newContainers);
  };

  const handleDragEnd = (result: any, containerIndex: number) => {
    if (!result.destination) return;

    const newContainers = [...containers];
    const items = Array.from(newContainers[containerIndex].components);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    newContainers[containerIndex].components = items;
    setContainers(newContainers);
  };

  const applyTemplate = (templateKey: string) => {
    const template = templates[templateKey as keyof typeof templates];
    if (template) {
      setContainers(template.containers);
      setShowTemplateDialog(false);
      setSnackbar({ open: true, message: `Applied ${template.name} template`, severity: 'success' });
    }
  };

  const handleSave = () => {
    onSave(containers);
    setSnackbar({ open: true, message: 'Embed configuration saved!', severity: 'success' });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(containers, null, 2));
    setSnackbar({ open: true, message: 'Copied to clipboard!', severity: 'info' });
  };

  const renderComponent = (component: any, containerIndex: number, componentIndex: number) => {
    switch (component.type) {
      case V2_COMPONENT_TYPES.TEXT:
        return (
          <Paper elevation={1} sx={{ p: 2, my: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Chip icon={<TextIcon />} label="Text" size="small" />
              <IconButton size="small" onClick={() => deleteComponent(containerIndex, componentIndex)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
            <TextField
              fullWidth
              multiline
              rows={2}
              value={component.content || ''}
              onChange={(e) => updateComponent(containerIndex, componentIndex, { content: e.target.value })}
              label="Content"
              margin="normal"
              helperText="Supports markdown formatting"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Style</InputLabel>
              <Select
                value={component.style || 0}
                onChange={(e) => updateComponent(containerIndex, componentIndex, { style: e.target.value })}
                label="Style"
              >
                {TEXT_STYLES.map(style => (
                  <MenuItem key={style.value} value={style.value}>{style.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        );

      case V2_COMPONENT_TYPES.MEDIA_GALLERY:
        return (
          <Paper elevation={1} sx={{ p: 2, my: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Chip icon={<ImageIcon />} label="Media Gallery" size="small" />
              <IconButton size="small" onClick={() => deleteComponent(containerIndex, componentIndex)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
            {component.items?.map((item: any, idx: number) => (
              <Box key={idx} sx={{ mt: 2 }}>
                <TextField
                  fullWidth
                  value={item.url || ''}
                  onChange={(e) => {
                    const newItems = [...(component.items || [])];
                    newItems[idx] = { ...newItems[idx], url: e.target.value };
                    updateComponent(containerIndex, componentIndex, { items: newItems });
                  }}
                  label="Image URL"
                  margin="normal"
                />
                <TextField
                  fullWidth
                  value={item.description || ''}
                  onChange={(e) => {
                    const newItems = [...(component.items || [])];
                    newItems[idx] = { ...newItems[idx], description: e.target.value };
                    updateComponent(containerIndex, componentIndex, { items: newItems });
                  }}
                  label="Description (Alt Text)"
                  margin="normal"
                />
              </Box>
            ))}
            <Button
              startIcon={<AddIcon />}
              onClick={() => {
                const newItems = [...(component.items || []), { url: '', description: '' }];
                updateComponent(containerIndex, componentIndex, { items: newItems });
              }}
              sx={{ mt: 1 }}
            >
              Add Image
            </Button>
          </Paper>
        );

      case V2_COMPONENT_TYPES.DIVIDER:
        return (
          <Paper elevation={1} sx={{ p: 2, my: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Chip icon={<DividerIcon />} label="Divider" size="small" />
              <IconButton size="small" onClick={() => deleteComponent(containerIndex, componentIndex)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Divider sx={{ my: 2 }} />
          </Paper>
        );

      case V2_COMPONENT_TYPES.ACTION_ROW:
        return (
          <Paper elevation={1} sx={{ p: 2, my: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Chip icon={<ButtonIcon />} label="Action Row" size="small" />
              <IconButton size="small" onClick={() => deleteComponent(containerIndex, componentIndex)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Stack>
            <Box sx={{ mt: 2 }}>
              {component.components?.map((button: any, btnIdx: number) => (
                <Box key={btnIdx} sx={{ mb: 2, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                  <TextField
                    fullWidth
                    value={button.label || ''}
                    onChange={(e) => {
                      const newButtons = [...(component.components || [])];
                      newButtons[btnIdx] = { ...newButtons[btnIdx], label: e.target.value };
                      updateComponent(containerIndex, componentIndex, { components: newButtons });
                    }}
                    label="Button Label"
                    margin="normal"
                  />
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <FormControl fullWidth margin="normal">
                        <InputLabel>Style</InputLabel>
                        <Select
                          value={button.style || 1}
                          onChange={(e) => {
                            const newButtons = [...(component.components || [])];
                            newButtons[btnIdx] = { ...newButtons[btnIdx], style: e.target.value };
                            updateComponent(containerIndex, componentIndex, { components: newButtons });
                          }}
                          label="Style"
                        >
                          {BUTTON_STYLES.map(style => (
                            <MenuItem key={style.value} value={style.value}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box sx={{ width: 16, height: 16, bgcolor: style.color, borderRadius: 0.5 }} />
                                {style.label}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        value={button.emoji || ''}
                        onChange={(e) => {
                          const newButtons = [...(component.components || [])];
                          newButtons[btnIdx] = { ...newButtons[btnIdx], emoji: e.target.value };
                          updateComponent(containerIndex, componentIndex, { components: newButtons });
                        }}
                        label="Emoji"
                        margin="normal"
                      />
                    </Grid>
                  </Grid>
                  {button.style === 5 ? (
                    <TextField
                      fullWidth
                      value={button.url || ''}
                      onChange={(e) => {
                        const newButtons = [...(component.components || [])];
                        newButtons[btnIdx] = { ...newButtons[btnIdx], url: e.target.value };
                        updateComponent(containerIndex, componentIndex, { components: newButtons });
                      }}
                      label="URL"
                      margin="normal"
                    />
                  ) : (
                    <TextField
                      fullWidth
                      value={button.custom_id || ''}
                      onChange={(e) => {
                        const newButtons = [...(component.components || [])];
                        newButtons[btnIdx] = { ...newButtons[btnIdx], custom_id: e.target.value };
                        updateComponent(containerIndex, componentIndex, { components: newButtons });
                      }}
                      label="Custom ID"
                      margin="normal"
                    />
                  )}
                  <IconButton
                    size="small"
                    onClick={() => {
                      const newButtons = component.components.filter((_: any, i: number) => i !== btnIdx);
                      updateComponent(containerIndex, componentIndex, { components: newButtons });
                    }}
                    sx={{ mt: 1 }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
              <Button
                startIcon={<AddIcon />}
                onClick={() => addButtonToActionRow(containerIndex, componentIndex)}
                disabled={(component.components?.length || 0) >= 5}
                fullWidth
                variant="outlined"
              >
                Add Button (Max 5)
              </Button>
            </Box>
          </Paper>
        );

      default:
        return null;
    }
  };

  const renderPreview = () => {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto' }}>
        {containers.map((container, idx) => (
          <Card key={container.id} sx={{ mb: 2, bgcolor: '#2f3136', color: 'white' }}>
            <CardContent>
              {container.components.map((component: any) => {
                switch (component.type) {
                  case V2_COMPONENT_TYPES.TEXT:
                    const fontSize = component.style === 3 ? '1.5rem' : component.style === 2 ? '1.2rem' : component.style === 1 ? '0.9rem' : '1rem';
                    const fontWeight = component.style === 4 || component.style === 20 ? 'bold' : 'normal';
                    const fontStyle = component.style === 16 || component.style === 20 ? 'italic' : 'normal';
                    return (
                      <Typography
                        key={component.id}
                        sx={{ fontSize, fontWeight, fontStyle, mb: 1 }}
                        dangerouslySetInnerHTML={{ __html: component.content?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') || '' }}
                      />
                    );
                  case V2_COMPONENT_TYPES.MEDIA_GALLERY:
                    return (
                      <Box key={component.id} sx={{ mb: 2 }}>
                        {component.items?.map((item: any, i: number) => (
                          <img
                            key={i}
                            src={item.url || 'https://via.placeholder.com/600x200'}
                            alt={item.description}
                            style={{ width: '100%', borderRadius: 8, marginBottom: 8 }}
                          />
                        ))}
                      </Box>
                    );
                  case V2_COMPONENT_TYPES.DIVIDER:
                    return <Divider key={component.id} sx={{ my: 2, bgcolor: '#40444b' }} />;
                  case V2_COMPONENT_TYPES.ACTION_ROW:
                    return (
                      <Stack key={component.id} direction="row" spacing={1} sx={{ mt: 2 }}>
                        {component.components?.map((button: any) => (
                          <Button
                            key={button.id}
                            variant="contained"
                            startIcon={button.emoji}
                            sx={{
                              bgcolor: BUTTON_STYLES.find(s => s.value === button.style)?.color || '#5865F2',
                              textTransform: 'none',
                              '&:hover': {
                                bgcolor: BUTTON_STYLES.find(s => s.value === button.style)?.color || '#5865F2',
                                filter: 'brightness(0.9)'
                              }
                            }}
                          >
                            {button.label}
                          </Button>
                        ))}
                      </Stack>
                    );
                  default:
                    return null;
                }
              })}
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  };

  return (
    <Dialog open fullScreen onClose={onClose}>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h5">V2 Embed Builder - {commandName}</Typography>
          <Stack direction="row" spacing={1}>
            <FormControlLabel
              control={<Switch checked={previewMode} onChange={(e) => setPreviewMode(e.target.checked)} />}
              label="Preview"
            />
            <Tooltip title="Use Template">
              <IconButton onClick={() => setShowTemplateDialog(true)}>
                <PaletteIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy JSON">
              <IconButton onClick={copyToClipboard}>
                <CopyIcon />
              </IconButton>
            </Tooltip>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>
              Save
            </Button>
            <Button variant="outlined" onClick={onClose}>
              Close
            </Button>
          </Stack>
        </Stack>
      </DialogTitle>
      
      <DialogContent>
        {previewMode ? (
          renderPreview()
        ) : (
          <Grid container spacing={3}>
            <Grid item xs={3}>
              <Paper sx={{ p: 2, height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                <Typography variant="h6" gutterBottom>
                  Containers
                </Typography>
                {containers.map((container, idx) => (
                  <Card
                    key={container.id}
                    sx={{
                      mb: 2,
                      cursor: 'pointer',
                      border: selectedContainer === idx ? '2px solid #5865F2' : '1px solid #ccc'
                    }}
                    onClick={() => setSelectedContainer(idx)}
                  >
                    <CardContent>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="subtitle1">
                          Container {idx + 1}
                        </Typography>
                        <IconButton size="small" onClick={(e) => {
                          e.stopPropagation();
                          deleteContainer(idx);
                        }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Typography variant="caption" color="text.secondary">
                        {container.components.length} components
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={addContainer}
                >
                  Add Container
                </Button>
              </Paper>
            </Grid>
            
            <Grid item xs={9}>
              {selectedContainer !== null && containers[selectedContainer] ? (
                <Paper sx={{ p: 2, height: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                  <Typography variant="h6" gutterBottom>
                    Container {selectedContainer + 1} Components
                  </Typography>
                  
                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Button
                      size="small"
                      startIcon={<TextIcon />}
                      onClick={() => addComponent(selectedContainer, V2_COMPONENT_TYPES.TEXT)}
                    >
                      Text
                    </Button>
                    <Button
                      size="small"
                      startIcon={<ImageIcon />}
                      onClick={() => addComponent(selectedContainer, V2_COMPONENT_TYPES.MEDIA_GALLERY)}
                    >
                      Media
                    </Button>
                    <Button
                      size="small"
                      startIcon={<DividerIcon />}
                      onClick={() => addComponent(selectedContainer, V2_COMPONENT_TYPES.DIVIDER)}
                    >
                      Divider
                    </Button>
                    <Button
                      size="small"
                      startIcon={<ButtonIcon />}
                      onClick={() => addComponent(selectedContainer, V2_COMPONENT_TYPES.ACTION_ROW)}
                    >
                      Buttons
                    </Button>
                  </Stack>

                  <DragDropContext onDragEnd={(result) => handleDragEnd(result, selectedContainer)}>
                    <Droppable droppableId="components">
                      {(provided) => (
                        <Box {...provided.droppableProps} ref={provided.innerRef}>
                          {containers[selectedContainer].components.map((component: any, idx: number) => (
                            <Draggable key={component.id} draggableId={String(component.id)} index={idx}>
                              {(provided) => (
                                <Box
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  sx={{ position: 'relative' }}
                                >
                                  <Box
                                    {...provided.dragHandleProps}
                                    sx={{
                                      position: 'absolute',
                                      left: -30,
                                      top: 20,
                                      cursor: 'grab'
                                    }}
                                  >
                                    <DragIcon />
                                  </Box>
                                  {renderComponent(component, selectedContainer, idx)}
                                </Box>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </Box>
                      )}
                    </Droppable>
                  </DragDropContext>
                </Paper>
              ) : (
                <Paper sx={{ p: 4, textAlign: 'center', height: 'calc(100vh - 200px)' }}>
                  <Typography variant="h6" color="text.secondary">
                    Select a container or create a new one
                  </Typography>
                </Paper>
              )}
            </Grid>
          </Grid>
        )}
      </DialogContent>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onClose={() => setShowTemplateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Choose a Template</DialogTitle>
        <DialogContent>
          <Grid container spacing={2}>
            {Object.entries(templates).map(([key, template]) => (
              <Grid item xs={12} key={key}>
                <Card
                  sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                  onClick={() => applyTemplate(key)}
                >
                  <CardContent>
                    <Typography variant="h6">{template.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {template.containers.length} container(s)
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}