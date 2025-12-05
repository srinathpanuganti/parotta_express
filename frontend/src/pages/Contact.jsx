import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.message.trim()) newErrors.message = 'Message is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    const newErrors = validateForm();

    if (Object.keys(newErrors).length === 0) {
      setSubmitting(true);
      try {
        const API_BASE = process.env.REACT_APP_API_BASE || '';
        const res = await fetch(`${API_BASE}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (res.ok) {
          setStatus({
            type: 'success',
            message: 'Thank you! Your message has been sent. We will get back to you shortly.',
          });
          setErrors({});
          setFormData({ name: '', email: '', message: '' });
        } else {
          const err = await res.json().catch(() => ({}));
          const msg = err.error === 'invalid_fields'
            ? 'Please check the highlighted fields.'
            : 'Unable to send your message. Please try again.';
          setStatus({ type: 'error', message: msg });
        }
      } catch (e) {
        setStatus({ type: 'error', message: 'Network error. Please try again later.' });
      } finally {
        setSubmitting(false);
      }
    } else {
      setErrors(newErrors);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16" data-testid="contact-page">
      {/* Header */}
      <div className="bg-gradient-to-r from-maroon-700 to-maroon-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="font-heading text-5xl font-bold mb-4">Get in Touch</h1>
            <p className="text-xl text-gray-200">
              We'd love to hear from you! Reach out for orders, catering, or any questions.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-1 space-y-6"
          >
            <Card data-testid="contact-info-location">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-saffron-100 rounded-full">
                    <MapPin className="h-6 w-6 text-saffron-600" />
                  </div>
                  <div>
                    <CardTitle>Visit Us</CardTitle>
                    <CardDescription>Our location</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  820 S MacArthur Blvd #112<br />
                  Coppell, TX 75019
                </p>
                <a
                  href="https://maps.google.com/?q=820+S+MacArthur+Blvd+112+Coppell+TX+75019"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-saffron-600 hover:text-saffron-700 text-sm mt-2 inline-block"
                  data-testid="view-map-link"
                >
                  View on Map →
                </a>
              </CardContent>
            </Card>

            <Card data-testid="contact-info-phone">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-saffron-100 rounded-full">
                    <Phone className="h-6 w-6 text-saffron-600" />
                  </div>
                  <div>
                    <CardTitle>Call Us</CardTitle>
                    <CardDescription>For orders & inquiries</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <a
                  href="tel:+19455460010"
                  className="text-gray-700 hover:text-saffron-600 text-lg font-semibold"
                  data-testid="contact-phone-link"
                >
                  +1 945-546-0010
                </a>
              </CardContent>
            </Card>

            <Card data-testid="contact-info-email">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-saffron-100 rounded-full">
                    <Mail className="h-6 w-6 text-saffron-600" />
                  </div>
                  <div>
                    <CardTitle>Email Us</CardTitle>
                    <CardDescription>For corporate inquiries</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <a
                  href="mailto:parottaexpress.corp@gmail.com"
                  className="text-gray-700 hover:text-saffron-600 break-all"
                  data-testid="contact-email-link"
                >
                  parottaexpress.corp@gmail.com
                </a>
              </CardContent>
            </Card>

            <Card data-testid="contact-info-hours">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-saffron-100 rounded-full">
                    <Clock className="h-6 w-6 text-saffron-600" />
                  </div>
                  <div>
                    <CardTitle>Business Hours</CardTitle>
                    <CardDescription>We're open</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-gray-700">
                  <div className="flex justify-between">
                    <span>Monday:</span>
                    <span className="font-semibold">Closed</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tuesday - Friday:</span>
                    <span className="font-semibold">12:00 PM - 11:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Saturday - Sunday:</span>
                    <span className="font-semibold">9:00 AM - 11:00 PM</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Send Us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6" data-testid="contact-form">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Your full name"
                      data-testid="contact-form-name"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="your.email@example.com"
                      data-testid="contact-form-email"
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Tell us what you're looking for..."
                      rows={6}
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      data-testid="contact-form-message"
                    />
                    {errors.message && (
                      <p className="text-sm text-red-500">{errors.message}</p>
                    )}
                  </div>

                  {status && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 border rounded-md ${status.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                      data-testid="contact-form-status"
                    >
                      <p className={`font-semibold ${status.type === 'success' ? 'text-green-800' : 'text-red-700'}`}>
                        {status.type === 'success' ? 'Success' : 'There was a problem'}
                      </p>
                      <p className={`${status.type === 'success' ? 'text-green-600' : 'text-red-600'} text-sm`}>
                        {status.message}
                      </p>
                    </motion.div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full sm:w-auto"
                    disabled={submitting}
                    data-testid="contact-form-submit"
                  >
                    {submitting ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Map Placeholder */}
            <Card className="mt-6">
              <CardContent className="p-0">
                <div className="relative h-64 bg-gray-200 rounded-lg overflow-hidden">
                  <iframe
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3348.0!2d-96.9989!3d32.9545!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x864c27e1!2s820%20S%20MacArthur%20Blvd%20%23112%2C%20Coppell%2C%20TX%2075019!5e0!3m2!1sen!2sus!4v1234567890"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Parotta Express Location"
                    data-testid="contact-map"
                  ></iframe>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
