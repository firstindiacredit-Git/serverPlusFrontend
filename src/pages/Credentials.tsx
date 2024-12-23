import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, Card, List, message, Popconfirm, Tooltip, Progress } from 'antd';
import { 
  PlusOutlined, 
  AppstoreOutlined, 
  UnorderedListOutlined, 
  EditOutlined, 
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  CopyOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import LockScreen from '../components/LockScreen';
import { checkPasswordStrength } from '../utils/passwordStrength';

interface Credential {
  id: string;
  title: string;
  username: string;
  password: string;
  url: string;
  createdAt: Date;
  userId: string;
  updatedAt?: Date;
}

interface CredentialData {
  title: string;
  username: string;
  password: string;
  url: string;
  userId: string;
  createdAt?: Timestamp;
  updatedAt: Timestamp;
}

const Credentials: React.FC = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [isGridView, setIsGridView] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [url, setUrl] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [visiblePasswords, setVisiblePasswords] = useState<{ [key: string]: boolean }>({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    fetchCredentials();
  }, [user]);

  useEffect(() => {
    const newVisiblePasswords: { [key: string]: boolean } = {};
    credentials.forEach(cred => {
      newVisiblePasswords[cred.id] = showAllPasswords;
    });
    setVisiblePasswords(newVisiblePasswords);
  }, [showAllPasswords, credentials]);

  const fetchCredentials = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      console.log('Fetching credentials for user:', user.uid);
      const credentialsRef = collection(db, 'users', user.uid, 'credentials');
      const querySnapshot = await getDocs(credentialsRef);
      const fetchedCredentials: Credential[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedCredentials.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate(),
        } as Credential);
      });
      
      console.log('Fetched credentials:', fetchedCredentials.length);
      setCredentials(fetchedCredentials.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
    } catch (error) {
      console.error('Error fetching credentials:', error);
      message.error('Failed to fetch credentials: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredential = async () => {
    if (!user) {
      console.error('No user found');
      return;
    }

    // Validate form
    if (!title.trim()) {
      message.error('Title is required');
      return;
    }
    if (!username.trim()) {
      message.error('Username is required');
      return;
    }
    if (!password.trim()) {
      message.error('Password is required');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Adding credential for user:', user.uid);
      const credentialsRef = collection(db, 'users', user.uid, 'credentials');
      
      const newCredential = {
        title: title.trim(),
        username: username.trim(),
        password: password.trim(),
        url: url.trim(),
        createdAt: Timestamp.fromDate(new Date()),
        userId: user.uid // Add userId for extra security
      };
      console.log('New credential data:', { ...newCredential, password: '****' });
      
      const docRef = await addDoc(credentialsRef, newCredential);
      console.log('Document written with ID:', docRef.id);
      
      message.success('Credential added successfully');
      setIsModalVisible(false);
      clearForm();
      fetchCredentials();
    } catch (error) {
      console.error('Error adding credential:', error);
      message.error('Failed to add credential: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (credential: Credential) => {
    setEditingCredential(credential);
    setTitle(credential.title);
    setUsername(credential.username);
    setPassword(credential.password);
    setUrl(credential.url || '');
    setIsEditMode(true);
    setIsModalVisible(true);
  };

  const handleDelete = async (credentialId: string) => {
    if (!user) return;

    try {
      setLoading(true);
      const credentialRef = doc(db, 'users', user.uid, 'credentials', credentialId);
      await deleteDoc(credentialRef);
      message.success('Credential deleted successfully');
      fetchCredentials();
    } catch (error) {
      console.error('Error deleting credential:', error);
      message.error('Failed to delete credential');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    // Validate form
    if (!title.trim()) {
      message.error('Title is required');
      return;
    }
    if (!username.trim()) {
      message.error('Username is required');
      return;
    }
    if (!password.trim()) {
      message.error('Password is required');
      return;
    }

    try {
      setLoading(true);
      const credentialData: CredentialData = {
        title: title.trim(),
        username: username.trim(),
        password: password.trim(),
        url: url.trim(),
        userId: user.uid,
        updatedAt: Timestamp.fromDate(new Date())
      };

      if (isEditMode && editingCredential) {
        // Update existing credential
        const credentialRef = doc(db, 'users', user.uid, 'credentials', editingCredential.id);
        await updateDoc(credentialRef, {
          ...credentialData,
          updatedAt: Timestamp.fromDate(new Date())
        });
        message.success('Credential updated successfully');
      } else {
        // Add new credential
        const credentialsRef = collection(db, 'users', user.uid, 'credentials');
        const newCredentialData = {
          ...credentialData,
          createdAt: Timestamp.fromDate(new Date())
        };
        await addDoc(credentialsRef, newCredentialData);
        message.success('Credential added successfully');
      }

      setIsModalVisible(false);
      clearForm();
      fetchCredentials();
    } catch (error) {
      console.error('Error saving credential:', error);
      message.error(`Failed to ${isEditMode ? 'update' : 'add'} credential`);
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setTitle('');
    setUsername('');
    setPassword('');
    setUrl('');
    setIsEditMode(false);
    setEditingCredential(null);
  };

  const togglePasswordVisibility = (credentialId: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [credentialId]: !prev[credentialId]
    }));
  };

  const copyToClipboard = async (text: string, type: 'username' | 'password') => {
    try {
      await navigator.clipboard.writeText(text);
      message.success(`${type === 'username' ? 'Username' : 'Password'} copied to clipboard`);
    } catch (error) {
      message.error('Failed to copy to clipboard');
    }
  };

  const renderPasswordStrength = (password: string) => {
    const strength = checkPasswordStrength(password);
    return (
      <div className="mt-2">
        <div className="flex items-center gap-2">
          <SafetyOutlined style={{ color: strength.color }} />
          <Progress 
            percent={strength.score * 25} 
            size="small" 
            status="active"
            strokeColor={strength.color}
            showInfo={false}
          />
        </div>
        <div className="text-sm text-gray-500 flex justify-between mt-1">
          <span>{strength.label}</span>
          <Tooltip title="Estimated time to crack">
            <span>🕒 {strength.crackTime}</span>
          </Tooltip>
        </div>
      </div>
    );
  };

  const renderCredentialInfo = (credential: Credential) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <strong>Username:</strong>
        <div className="flex items-center gap-2">
          <span>{credential.username}</span>
          <Tooltip title="Copy username">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={() => copyToClipboard(credential.username, 'username')}
            />
          </Tooltip>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <strong>Password:</strong>
        <div className="flex items-center gap-2">
          <span>
            {visiblePasswords[credential.id] ? credential.password : '••••••••'}
          </span>
          <Tooltip title="Toggle visibility">
            <Button
              type="text"
              icon={visiblePasswords[credential.id] ? <EyeInvisibleOutlined /> : <EyeOutlined />}
              onClick={() => togglePasswordVisibility(credential.id)}
            />
          </Tooltip>
          <Tooltip title="Copy password">
            <Button 
              type="text" 
              icon={<CopyOutlined />} 
              onClick={() => copyToClipboard(credential.password, 'password')}
            />
          </Tooltip>
        </div>
      </div>

      {credential.url && (
        <div>
          <strong>URL:</strong>{' '}
          <a href={credential.url} target="_blank" rel="noopener noreferrer">
            {credential.url}
          </a>
        </div>
      )}

      {/* {renderPasswordStrength(credential.password)} */}
    </div>
  );

  const filteredCredentials = credentials.filter(cred => 
    cred.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cred.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cred.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredCredentials.map((credential) => (
        <Card
          key={credential.id}
          className="hover:shadow-lg transition-shadow"
          title={credential.title}
          actions={[
            <Button
              key="edit"
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(credential)}
            >
              Edit
            </Button>,
            <Popconfirm
              key="delete"
              title="Delete Credential"
              description="Are you sure you want to delete this credential?"
              onConfirm={() => handleDelete(credential.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
              >
                Delete
              </Button>
            </Popconfirm>
          ]}
        >
          {renderCredentialInfo(credential)}
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <List
    dataSource={filteredCredentials}
    renderItem={(credential) => (
      <List.Item key={credential.id} style={{padding: 15 }}  className='bg-white rounded-lg p-4 mb-6'>
        <List.Item.Meta
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', }}>
              <span>{credential.title}</span>
              <div>
                <Button
                  key="edit"
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(credential)}
                >
                  Edit
                </Button>
                <Popconfirm
                  key="delete"
                  title="Delete Credential"
                  description="Are you sure you want to delete this credential?"
                  onConfirm={() => handleDelete(credential.id)}
                  okText="Yes"
                  cancelText="No"
                  okButtonProps={{ danger: true }}
                >
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    danger
                  >
                    Delete
                  </Button>
                </Popconfirm>
              </div>
            </div>
          }
          description={renderCredentialInfo(credential)}
        />
      </List.Item>
    )}
  />
  
  


  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLockScreen={() => setIsLocked(true)} />
      <LockScreen isLocked={isLocked} onUnlock={() => setIsLocked(false)} />
      
      <div className={`max-w-7xl mx-auto px-4 py-6 ${isLocked ? 'filter blur-lg' : ''}`}>
        <div className="mb-6 flex justify-between items-center">
          <div className="flex w-full items-center space-x-8">
            <Input.Search
              placeholder="Search credentials..."
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
            <Button.Group>
              <Button
                type={isGridView ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setIsGridView(true)}
              />
              <Button
                type={!isGridView ? 'primary' : 'default'}
                icon={<UnorderedListOutlined />}
                onClick={() => setIsGridView(false)}
              />
              <Tooltip title={showAllPasswords ? "Hide all passwords" : "Show all passwords"}>
                <Button
                  type={showAllPasswords ? 'primary' : 'default'}
                  icon={showAllPasswords ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                  onClick={() => setShowAllPasswords(!showAllPasswords)}
                />
              </Tooltip>
            </Button.Group>
            <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsModalVisible(true)}
          >
            Add Credential
          </Button>
          </div>
          
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          isGridView ? renderGridView() : renderListView()
        )}

        <Modal
          title={isEditMode ? "Edit Credential" : "Add New Credential"}
          open={isModalVisible}
          onOk={handleSave}
          onCancel={() => {
            setIsModalVisible(false);
            clearForm();
          }}
          confirmLoading={loading}
        >
          <div className="space-y-4">
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <Input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <Input.Password
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              placeholder="URL"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default Credentials;
