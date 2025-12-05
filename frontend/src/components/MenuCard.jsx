import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

const MenuCard = ({ item, onOrder, showOrderButton = false, index = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      data-testid={`menu-card-${item.id}`}
    >
      <Card className="h-full hover:shadow-lg transition-shadow duration-300">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800" data-testid={`menu-item-name-${item.id}`}>
            {item.name}
          </CardTitle>
          {item.description && (
            <CardDescription className="text-sm text-gray-600" data-testid={`menu-item-description-${item.id}`}>
              {item.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-saffron-600" data-testid={`menu-item-price-${item.id}`}>
            ${item.price.toFixed(2)}
          </p>
        </CardContent>
        {showOrderButton && (
          <CardFooter>
            <Button 
              onClick={() => onOrder(item)} 
              className="w-full"
              data-testid={`order-button-${item.id}`}
            >
              Order Now
            </Button>
          </CardFooter>
        )}
      </Card>
    </motion.div>
  );
};

export default MenuCard;