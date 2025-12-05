import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const AuthModal = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  const validateLogin = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    return newErrors;
  };

  const validateSignup = () => {
    const newErrors = {};
    if (!formData.username.trim()) newErrors.username = 'Username is required';
    if (!formData.password.trim()) newErrors.password = 'Password is required';
    if (!formData.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s()+-]+$/.test(formData.phone)) {
      newErrors.phone = 'Phone number is invalid';
    }
    if (!formData.address.trim()) newErrors.address = 'Office address is required';
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');
    const newErrors = isLogin ? validateLogin() : validateSignup();
    if (Object.keys(newErrors).length !== 0) {
      setErrors(newErrors);
      return;
    }

    const doRequest = async () => {
      const API_BASE = process.env.REACT_APP_API_BASE || '';
      try {
        const url = (isLogin ? '/api/auth/login' : '/api/auth/signup');
        const payload = isLogin
          ? { username: formData.username, password: formData.password }
          : {
              username: formData.username,
              password: formData.password,
              name: `${formData.firstName.trim()} ${formData.lastName.trim()}`.trim(),
              email: formData.email,
              phone: formData.phone,
              address: formData.address,
            };
        const res = await fetch(`${API_BASE}${url}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setSubmitError(err.error || 'Authentication failed');
          return;
        }
        onSuccess();
        onClose();
      } catch (err) {
        setSubmitError('Network error');
      }
    };

    void doRequest();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setErrors({});
    setSubmitError('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="" data-testid="auth-modal">
        <DialogHeader>
          <DialogTitle data-testid="auth-modal-title">
            {isLogin ? 'Corporate Login' : 'Corporate Sign Up'}
          </DialogTitle>
          <DialogDescription data-testid="auth-modal-description">
            {isLogin
              ? 'Enter your credentials to access corporate meals'
              : 'Create an account to access corporate meal offerings'}
          </DialogDescription>
          {submitError && (
            <p className="text-sm text-red-600 mt-2" data-testid="auth-error">{submitError}</p>
          )}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {isLogin ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Enter your username"
                    data-testid="login-username-input"
                  />
                  {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    data-testid="login-password-input"
                  />
                  {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="your-company-username"
                    required
                    autoComplete="username"
                    data-testid="signup-username-input"
                  />
                  {errors.username && <p className="text-sm text-red-500">{errors.username}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="John"
                    required
                    autoComplete="given-name"
                    data-testid="signup-firstname-input"
                  />
                  {errors.firstName && <p className="text-sm text-red-500">{errors.firstName}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Doe"
                    required
                    autoComplete="family-name"
                    data-testid="signup-lastname-input"
                  />
                  {errors.lastName && <p className="text-sm text-red-500">{errors.lastName}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@company.com"
                    required
                    autoComplete="email"
                    data-testid="signup-email-input"
                  />
                  {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 234-567-8900"
                    required
                    autoComplete="tel"
                    data-testid="signup-phone-input"
                  />
                  {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Office Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="123 Business St, City, State"
                    required
                    autoComplete="street-address"
                    data-testid="signup-address-input"
                  />
                  {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    required
                    autoComplete="new-password"
                    data-testid="signup-password-input"
                  />
                  {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                </div>
              </>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-2">
            <Button type="submit" className="w-full" data-testid="auth-submit-button">
              {isLogin ? 'Login' : 'Create Account'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={switchMode}
              className="w-full"
              data-testid="auth-switch-mode-button"
            >
              {isLogin ? 'New user? Sign up' : 'Already have an account? Login'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
