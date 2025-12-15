import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import MenuCard from '@/components/MenuCard';
import menuData from '@/data/menuData.json';
import { ArrowRight, Star } from 'lucide-react';

const Home = () => {
  const scrollToMenu = () => {
    document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen" data-testid="home-page">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-saffron-50 via-white to-maroon-50 pt-24 pb-16 px-4 sm:px-6 lg:px-8" data-testid="hero-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Hero Text */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl font-bold text-maroon-800 mb-4" data-testid="hero-title">
                Parotta Express
              </h1>
              <p className="text-xl sm:text-2xl text-gray-700 mb-4 italic">
                "Prepare Food with Love, Serve with Utmost Care"
              </p>
              <p className="text-lg text-gray-600 mb-8">
                Experience authentic South Indian flavors with our homemade delights. From crispy dosas to aromatic biryanis, we bring you the taste of home.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={scrollToMenu}
                  size="lg"
                  className="text-lg"
                  data-testid="view-menu-button"
                >
                  View Menu
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <a href="tel:+19455460010">
                  <Button
                    variant="outline"
                    size="lg"
                    className="text-lg"
                    data-testid="order-now-button"
                  >
                    Order Now: +1 945-546-0010
                  </Button>
                </a>
              </div>
            </motion.div>

            {/* Hero Image */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1701579231305-d84d8af9a3fd?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Njd8MHwxfHNlYXJjaHwxfHxiaXJ5YW5pfGVufDB8fHx8MTc2MDY5MTA2NXww&ixlib=rb-4.1.0&q=85"
                  alt="Delicious Biryani"
                  className="w-full h-[400px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="text-2xl font-bold">Signature Biryani</p>
                  <p className="text-sm">Cooked to perfection</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Dishes */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white" data-testid="featured-section">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <div className="flex items-center justify-center mb-4">
              <Star className="h-6 w-6 text-saffron-500 mr-2" />
              <h2 className="font-heading text-4xl font-bold text-gray-800">Featured Dishes</h2>
              <Star className="h-6 w-6 text-saffron-500 ml-2" />
            </div>
            <p className="text-gray-600 text-lg">Our most loved specialties</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {menuData.featured.map((dish, index) => (
              <motion.div
                key={dish.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
              >
                <Card className="h-full hover:shadow-xl transition-shadow duration-300 overflow-hidden" data-testid={`featured-dish-${dish.id}`}>
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="text-xl">{dish.name}</CardTitle>
                    <CardDescription className="text-sm text-saffron-600 font-semibold">
                      {dish.category}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 text-sm mb-4">{dish.description}</p>
                    <p className="text-2xl font-bold text-saffron-600">${dish.price.toFixed(2)}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Full Menu Section */}
      <section id="menu-section" className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50" data-testid="menu-section">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="font-heading text-4xl font-bold text-gray-800 mb-4">Our Complete Menu</h2>
            <p className="text-gray-600 text-lg">Authentic South Indian cuisine made with love</p>
          </motion.div>

          <div className="space-y-16">
            {menuData.categories.map((category, catIndex) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: catIndex * 0.1 }}
                data-testid={`category-${category.id}`}
              >
                {/* Category Header */}
                <div className="mb-8">
                  <h3 className="font-heading text-3xl font-bold text-maroon-700 mb-2">
                    {category.name}
                  </h3>
                  <p className="text-gray-600">{category.description}</p>
                </div>

                {/* Category Items */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {category.items.map((item, itemIndex) => (
                    <MenuCard key={item.id} item={item} index={itemIndex} />
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-maroon-700 to-maroon-900 text-white" data-testid="cta-section">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="font-heading text-4xl font-bold mb-4">
              Ready to Experience Authentic Flavors?
            </h2>
            <p className="text-xl mb-8 text-gray-200">
              Order now and taste the difference homemade makes
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="tel:+19455460010">
                <Button
                  size="lg"
                  variant="default"
                  className="text-lg bg-saffron-500 hover:bg-saffron-600"
                  data-testid="cta-call-button"
                >
                  Call to Order
                </Button>
              </a>
              <a href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg text-white border-white hover:bg-white hover:text-maroon-900"
                  data-testid="cta-contact-button"
                >
                  Contact Us
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default Home;
