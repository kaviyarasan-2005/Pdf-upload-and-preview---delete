import React, { useState } from 'react';
import { View, Text, Button, FlatList, TouchableOpacity, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { WebView } from 'react-native-webview';
import { StorageAccessFramework } from 'expo-file-system';

export default function App() {
  const [pdfs, setPdfs] = useState([]); // Store uploaded PDFs
  const [selectedPdf, setSelectedPdf] = useState(null); // Selected PDF for preview
  const [directoryUri, setDirectoryUri] = useState(null); // Store chosen folder

  // 📂 Pick a PDF and move it to a safe directory
  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });

    if (result.canceled) return;

    const fileUri = result.assets[0].uri;
    let newUri = FileSystem.documentDirectory + result.assets[0].name;

    try {
      // Check if file already exists, rename if necessary
      const fileInfo = await FileSystem.getInfoAsync(newUri);
      if (fileInfo.exists) {
        const timestamp = new Date().getTime(); // Unique timestamp
        const fileExtension = result.assets[0].name.split('.').pop(); // Extract extension
        const newFileName = `${timestamp}.${fileExtension}`;
        newUri = FileSystem.documentDirectory + newFileName;
      }

      await FileSystem.copyAsync({ from: fileUri, to: newUri });
      setPdfs([...pdfs, { name: result.assets[0].name, uri: newUri }]);
      Alert.alert('Success', 'PDF uploaded successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload PDF');
      console.error('Error moving file:', error);
    }
  };

  // 📂 Let user choose a directory for saving files
  const pickDirectory = async () => {
    try {
      const permissions = await StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!permissions.granted) {
        Alert.alert('Permission Denied', 'You need to allow access to save files.');
        return;
      }
      setDirectoryUri(permissions.directoryUri); // Store selected folder
      Alert.alert('Success', 'Folder selected for saving files.');
    } catch (error) {
      Alert.alert('Error', 'Failed to select folder');
      console.error('Folder selection error:', error);
    }
  };

  // 📥 Download and save PDF to selected folder
  const downloadPdf = async (uri, fileName) => {
    try {
      if (!directoryUri) {
        Alert.alert('Error', 'No folder selected. Please select a folder first.');
        return;
      }

      // Read the file as binary
      const fileContent = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      
      // Create new file in selected directory
      const newFileUri = await StorageAccessFramework.createFileAsync(directoryUri, fileName, 'application/pdf');
      
      // Write the binary data to the new file
      await FileSystem.writeAsStringAsync(newFileUri, fileContent, { encoding: FileSystem.EncodingType.Base64 });

      Alert.alert('Success', 'PDF saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save PDF.');
      console.error('Save error:', error);
    }
  };

  // 📄 Load PDF for Preview (Convert to Base64)
  const loadPdfForPreview = async (uri) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      setSelectedPdf(`data:application/pdf;base64,${base64}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to load PDF for preview.');
      console.error('PDF Preview Error:', error);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      {/* Select Folder Button */}
      <Button title="Select Folder for Downloads" onPress={pickDirectory} />
      
      <View style={{  marginTop: 20 }}><Button  title="Upload PDF" onPress={pickPdf} /></View>
      {/* Upload Button */}

      {/* List of Uploaded PDFs */}
      <FlatList
        data={pdfs}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <View style={{ marginVertical: 10, padding: 10, borderWidth: 1, borderRadius: 10 }}>
            <Text>{item.name}</Text>

            {/* Preview Button */}
            <TouchableOpacity onPress={() => loadPdfForPreview(item.uri)}>
              <Text style={{ color: 'blue', marginTop: 5 }}>Preview</Text>
            </TouchableOpacity>

            {/* Download Button */}
            <TouchableOpacity onPress={() => downloadPdf(item.uri, item.name)}>
              <Text style={{ color: 'green', marginTop: 5}}>Download</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* PDF Preview */}
      {selectedPdf && (
        <View style={{ flex: 1, marginTop: 20 }}>
          <Text style={{ fontWeight: 'bold' }}>PDF Preview:</Text>
          <WebView 
            originWhitelist={['*']}
            source={{ uri: selectedPdf }}
            style={{ flex: 1, height: 500 }}
          />
        </View>
      )}
    </View>
  );
}