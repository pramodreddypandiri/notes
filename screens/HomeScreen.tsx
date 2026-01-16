import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import voiceService from '../services/voiceService';
import { createNote, getNotes } from '../services/notesService';

const HomeScreen = ({ navigation }: any) => {
  const [isRecording, setIsRecording] = useState(false);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotes();
    return () => voiceService.destroy();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await getNotes(20);
      setNotes(data || []);
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const handleRecordPress = async () => {
    if (isRecording) {
      // Stop recording
      setLoading(true);
      try {
        const transcript = await voiceService.stopRecording();
        
        if (transcript) {
          // Save note
          await createNote(transcript);
          await loadNotes();
        }
      } catch (error) {
        console.error('Recording error:', error);
      } finally {
        setIsRecording(false);
        setLoading(false);
      }
    } else {
      // Start recording
      try {
        await voiceService.startRecording();
        setIsRecording(true);
      } catch (error) {
        console.error('Failed to start recording:', error);
      }
    }
  };

  const renderNote = ({ item }: any) => (
    <View style={styles.noteCard}>
      <Text style={styles.noteText}>
        {item.parsed_data?.summary || item.transcript}
      </Text>
      <Text style={styles.noteTime}>
        {new Date(item.created_at).toLocaleString()}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Weekend Planner</Text>
        <TouchableOpacity
          style={styles.planButton}
          onPress={() => navigation.navigate('Plans')}
        >
          <Text style={styles.planButtonText}>Plan My Weekend</Text>
        </TouchableOpacity>
      </View>

      {/* Voice Recording Button */}
      <View style={styles.recordSection}>
        <TouchableOpacity
          style={[
            styles.micButton,
            isRecording && styles.micButtonRecording,
          ]}
          onPress={handleRecordPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <Text style={styles.micIcon}>🎤</Text>
          )}
        </TouchableOpacity>
        <Text style={styles.recordHint}>
          {isRecording ? 'Tap to stop recording' : 'Tap to record a note'}
        </Text>
      </View>

      {/* Notes List */}
      <View style={styles.notesSection}>
        <Text style={styles.sectionTitle}>Recent Notes</Text>
        <FlatList
          data={notes}
          renderItem={renderNote}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.notesList}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#6366f1',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
  },
  planButton: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  planButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
  },
  recordSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  micButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  micButtonRecording: {
    backgroundColor: '#ef4444',
  },
  micIcon: {
    fontSize: 48,
  },
  recordHint: {
    marginTop: 16,
    fontSize: 14,
    color: '#666',
  },
  notesSection: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  notesList: {
    paddingBottom: 20,
  },
  noteCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  noteText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  noteTime: {
    fontSize: 12,
    color: '#999',
  },
});

export default HomeScreen;