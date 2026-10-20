import React from 'react';
import {
  Alert,
  AppBar,
  Box,
  Button,
  Container,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography
} from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

const tableDefinitions = {
  users: {
    label: 'Users',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'username', label: 'Username' },
      { name: 'password', label: 'Password', type: 'password' }
    ]
  },
  applicationsettings: {
    label: 'Application settings',
    fields: [
      { name: 'settingName', label: 'Setting name', required: true },
      { name: 'settingValue', label: 'Setting value' }
    ]
  },
  locations: {
    label: 'Locations',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'description', label: 'Description', multiline: true },
      { name: 'parentLocation', label: 'Parent location', type: 'number' }
    ]
  },
  characters: {
    label: 'Characters',
    fields: [
      { name: 'name', label: 'Name' },
      { name: 'type', label: 'Type' },
      { name: 'role', label: 'Role' },
      { name: 'location', label: 'Location', type: 'number' }
    ]
  },
  characterdetails: {
    label: 'Character details',
    fields: [
      { name: 'characterId', label: 'Character ID', type: 'number' },
      { name: 'charisma', label: 'Charisma', type: 'number' },
      { name: 'intelligence', label: 'Intelligence', type: 'number' },
      { name: 'wisdom', label: 'Wisdom', type: 'number' },
      { name: 'dexterity', label: 'Dexterity', type: 'number' },
      { name: 'constitution', label: 'Constitution', type: 'number' },
      { name: 'strength', label: 'Strength', type: 'number' },
      { name: 'race', label: 'Race' },
      { name: 'characterClass', label: 'Class' },
      { name: 'level', label: 'Level', type: 'number' },
      { name: 'alignment', label: 'Alignment' }
    ]
  },
  reputation: {
    label: 'Reputation',
    fields: [
      { name: 'characterId', label: 'Character ID', type: 'number' },
      { name: 'targetId', label: 'Target ID', type: 'number' },
      { name: 'adjustment', label: 'Adjustment', type: 'number' },
      { name: 'note', label: 'Note', multiline: true }
    ]
  }
};

const apiUrl = (tableName) => {
  const pagePath = window.location.pathname.endsWith('/')
    ? window.location.pathname
    : `${window.location.pathname}/`;
  return `${pagePath}api/${tableName}`;
};

function emptyForm(definition) {
  return Object.fromEntries(definition.fields.map((field) => [field.name, '']));
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
}

function App({ mode, onToggleMode }) {
  const [tableName, setTableName] = React.useState('users');
  const [records, setRecords] = React.useState([]);
  const [form, setForm] = React.useState(emptyForm(tableDefinitions.users));
  const [editingId, setEditingId] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState(null);

  const definition = tableDefinitions[tableName];

  const loadRecords = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl(tableName));
      if (!response.ok) {
        throw new Error('Unable to load records.');
      }
      setRecords(await response.json());
    } catch (error) {
      setMessage({ severity: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  React.useEffect(() => {
    setForm(emptyForm(definition));
    setEditingId(null);
    loadRecords();
  }, [definition, loadRecords]);

  const handleChange = (event) => {
    setForm((currentForm) => ({ ...currentForm, [event.target.name]: event.target.value }));
  };

  const saveRecord = async (event) => {
    event.preventDefault();
    const payload = {};

    definition.fields.forEach((field) => {
      const value = form[field.name];
      payload[field.name] = field.type === 'number'
        ? (value === '' ? null : Number(value))
        : (value === '' ? null : value);
    });

    try {
      const response = await fetch(editingId === null ? apiUrl(tableName) : `${apiUrl(tableName)}/${editingId}`, {
        method: editingId === null ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Unable to save record.');
      }
      setMessage({ severity: 'success', text: editingId === null ? 'Record created.' : 'Record updated.' });
      setForm(emptyForm(definition));
      setEditingId(null);
      await loadRecords();
    } catch (error) {
      setMessage({ severity: 'error', text: error.message });
    }
  };

  const editRecord = (record) => {
    setEditingId(record.id);
    setForm(Object.fromEntries(definition.fields.map((field) => [field.name, formatValue(record[field.name])] )));
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this record?')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl(tableName)}/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || 'Unable to delete record.');
      }
      setMessage({ severity: 'success', text: 'Record deleted.' });
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm(definition));
      }
      await loadRecords();
    } catch (error) {
      setMessage({ severity: 'error', text: error.message });
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>WorldBuilder</Typography>
          <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
            <IconButton color="inherit" onClick={onToggleMode}>
              {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Stack spacing={3}>
          <Box>
            <Typography variant="h4" gutterBottom>Database manager</Typography>
            <Typography color="text.secondary">Create and manage records across the WorldBuilder database.</Typography>
          </Box>
          <FormControl fullWidth>
            <InputLabel id="table-label">Table</InputLabel>
            <Select
              labelId="table-label"
              value={tableName}
              label="Table"
              onChange={(event) => setTableName(event.target.value)}
            >
              {Object.entries(tableDefinitions).map(([name, table]) => (
                <MenuItem key={name} value={name}>{table.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <Paper component="form" onSubmit={saveRecord} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>{editingId === null ? 'Add' : 'Edit'} {definition.label}</Typography>
            <Grid container spacing={2}>
              {definition.fields.map((field) => (
                <Grid item xs={12} sm={field.multiline ? 12 : 6} md={field.multiline ? 12 : 4} key={field.name}>
                  <TextField
                    fullWidth
                    required={field.required}
                    name={field.name}
                    label={field.label}
                    type={field.type || 'text'}
                    value={form[field.name]}
                    onChange={handleChange}
                    multiline={field.multiline}
                    minRows={field.multiline ? 3 : undefined}
                  />
                </Grid>
              ))}
            </Grid>
            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button type="submit" variant="contained">{editingId === null ? 'Create' : 'Save'}</Button>
              {editingId !== null && <Button onClick={() => { setEditingId(null); setForm(emptyForm(definition)); }}>Cancel</Button>}
            </Stack>
          </Paper>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>{definition.label}</Typography>
            {loading && <Typography color="text.secondary">Loading...</Typography>}
            {!loading && records.map((record) => (
              <Stack key={record.id} direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Typography sx={{ flexGrow: 1 }}>{definition.fields.map((field) => `${field.label}: ${formatValue(record[field.name])}`).join(' · ')}</Typography>
                <Stack direction="row">
                  <Tooltip title="Edit"><IconButton onClick={() => editRecord(record)}><EditIcon /></IconButton></Tooltip>
                  <Tooltip title="Delete"><IconButton color="error" onClick={() => deleteRecord(record.id)}><DeleteIcon /></IconButton></Tooltip>
                </Stack>
              </Stack>
            ))}
            {!loading && records.length === 0 && <Typography color="text.secondary">No records found.</Typography>}
          </Paper>
        </Stack>
      </Container>
      <Snackbar open={Boolean(message)} autoHideDuration={4000} onClose={() => setMessage(null)}>
        <Alert severity={message?.severity || 'info'} onClose={() => setMessage(null)}>{message?.text}</Alert>
      </Snackbar>
    </>
  );
}

export default App;
