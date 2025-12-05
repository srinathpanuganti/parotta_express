import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const toggleMenu = () => setIsOpen(!isOpen);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Corporate Meals', path: '/corporate', special: true },
    { name: 'Contact Us', path: '/contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-md z-50" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3" data-testid="navbar-logo">
            <img src="/logo.png" alt="Parotta Express" className="h-12 w-12 object-contain" />
            <div className="hidden sm:block">
              <span className="font-heading font-bold text-xl text-maroon-700">Parotta Express</span>
              <p className="text-xs text-gray-600">Homemade Delights</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              link.special ? (
                <Button
                  key={link.name}
                  onClick={() => navigate(link.path)}
                  variant="secondary"
                  size="sm"
                  data-testid="navbar-corporate-button"
                >
                  {link.name}
                </Button>
              ) : (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-gray-700 hover:text-saffron-600 font-medium transition-colors"
                  data-testid={`navbar-${link.name.toLowerCase().replace(' ', '-')}`}
                >
                  {link.name}
                </Link>
              )
            ))}
            <a href="tel:+19455460010" className="flex items-center text-saffron-600 hover:text-saffron-700 font-semibold" data-testid="navbar-phone">
              <Phone className="h-4 w-4 mr-1" />
              <span className="hidden lg:inline">+1 945-546-0010</span>
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={toggleMenu}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-saffron-600 hover:bg-gray-100 focus:outline-none"
            data-testid="navbar-mobile-menu-button"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-200"
            data-testid="navbar-mobile-menu"
          >
            <div className="px-4 pt-2 pb-4 space-y-2">
              {navLinks.map((link) => (
                link.special ? (
                  <Button
                    key={link.name}
                    onClick={() => {
                      navigate(link.path);
                      setIsOpen(false);
                    }}
                    variant="secondary"
                    className="w-full"
                    data-testid="mobile-corporate-button"
                  >
                    {link.name}
                  </Button>
                ) : (
                  <Link
                    key={link.name}
                    to={link.path}
                    className="block px-3 py-2 rounded-md text-gray-700 hover:text-saffron-600 hover:bg-gray-50 font-medium"
                    onClick={() => setIsOpen(false)}
                    data-testid={`mobile-${link.name.toLowerCase().replace(' ', '-')}`}
                  >
                    {link.name}
                  </Link>
                )
              ))}
              <a
                href="tel:+19455460010"
                className="flex items-center px-3 py-2 text-saffron-600 hover:bg-saffron-50 rounded-md font-semibold"
                data-testid="mobile-phone"
              >
                <Phone className="h-4 w-4 mr-2" />
                Call: +1 945-546-0010
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;