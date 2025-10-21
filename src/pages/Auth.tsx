import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface CompanyConfig {
  company_name: string;
  company_logo: string;
}

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  
  const navigate = useNavigate();
  const { signIn, user } = useAuth();

  useEffect(() => {
    // Check if user is already logged in
    if (user) {
      navigate('/');
    }

    // Fetch company config from MongoDB API
    fetchCompanyConfig();
  }, [user, navigate]);

  const fetchCompanyConfig = async () => {
    try {
      const response = await fetch('/api/company-config');
      if (response.ok) {
        const data = await response.json();
        setCompanyConfig(data);
      }
    } catch (error) {
      console.error('Error fetching company config:', error);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Console log the password and its encoding methods
    console.log('=== PASSWORD DEBUG INFO ===');
    console.log('Raw password entered:', password);
    console.log('Password length:', password.length);
    
    // Base64 encode the password
    const base64Password = btoa(password);
    console.log('Base64 encoded password:', base64Password);
    console.log('Base64 decoded back:', );
    // URL encode the password
    const urlEncodedPassword = encodeURIComponent(password);
    console.log('URL encoded password:', urlEncodedPassword);
    
    // Show how it would look in MongoDB connection string
    const mongoConnectionExample = `mongodb://admin:${urlEncodedPassword}@localhost:27017/sandbox_db`;
    console.log('MongoDB connection string format:', mongoConnectionExample);
    
    // Simulate bcrypt hash (just for display, actual hashing happens on server)
    console.log('This password will be bcrypt hashed on the server side');
    console.log('================================');

    try {
      const { error } = await signIn(email, password);
      
      if (error) {
        setError(error.message);
        toast.error('Error al iniciar sesión: ' + error.message);
      } else {
        toast.success('¡Sesión iniciada exitosamente!');
        navigate('/');
      }
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión');
      toast.error('Error al iniciar sesión: ' + (error.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {companyConfig?.company_logo && (
            <div className="flex justify-center mb-4">
              <img
                src={companyConfig.company_logo}
                alt={companyConfig.company_name || 'Company Logo'}
                className="h-16 w-auto object-contain"
                onError={(e) => {
                  console.error('Error loading company logo:', companyConfig.company_logo);
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}
          <CardTitle className="text-2xl font-bold">
            {companyConfig?.company_name || 'M8 Platform'}
          </CardTitle>
          <p className="text-muted-foreground">Accede a tu cuenta</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
