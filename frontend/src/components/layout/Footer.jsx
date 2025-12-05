import React from 'react';
import { MapPin, Mail, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-maroon-800 text-white pt-12 pb-6" data-testid="footer">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Logo and Tagline */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <img src="/logo.png" alt="Parotta Express" className="h-16 w-16 object-contain" />
              <div>
                <h3 className="font-heading font-bold text-xl">Parotta Express</h3>
                <p className="text-sm text-saffron-200">Homemade Delights</p>
              </div>
            </div>
            <p className="text-sm text-gray-300 italic">
              "Prepare Food with Love,<br />Serve with Utmost Care"
            </p>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-saffron-300">Contact Us</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <MapPin className="h-5 w-5 text-saffron-400 mt-0.5 flex-shrink-0" />
                <p className="text-gray-300">
                  820 S MacArthur Blvd #112,<br />
                  Coppell, TX 75019
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-saffron-400" />
                <a href="tel:+19455460010" className="text-gray-300 hover:text-saffron-300 transition-colors">
                  +1 945-546-0010
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-saffron-400" />
                <a href="mailto:parottaexpress.corp@gmail.com" className="text-gray-300 hover:text-saffron-300 transition-colors break-all">
                  parottaexpress.corp@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-4 text-saffron-300">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-gray-300 hover:text-saffron-300 transition-colors" data-testid="footer-home-link">
                  Home & Menu
                </Link>
              </li>
              <li>
                <Link to="/corporate" className="text-gray-300 hover:text-saffron-300 transition-colors" data-testid="footer-corporate-link">
                  Corporate Meals
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray-300 hover:text-saffron-300 transition-colors" data-testid="footer-contact-link">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-maroon-700 pt-6 text-center">
          <p className="text-sm text-gray-400">
            © {new Date().getFullYear()} Parotta Express. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;