'use strict';

module.exports = (sequelize, DataTypes) => {
  const Recipe = sequelize.define('Recipe', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ingredients: {
      type: DataTypes.JSON, // Array of {name: string, amount: string, unit: string}
      allowNull: false,
      defaultValue: []
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    nutrition_per_serving: {
      type: DataTypes.JSON, // {calories: number, protein: number, fat: number, carbs: number}
      allowNull: false
    },
    difficulty_level: {
      type: DataTypes.ENUM,
      values: ['easy', 'medium', 'hard'],
      defaultValue: 'medium'
    },
    cooking_time: {
      type: DataTypes.INTEGER, // in minutes
      allowNull: true
    },
    servings: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    tags: {
      type: DataTypes.JSON, // Array of strings: ['завтрак', 'обед', 'ужин', 'вегетарианское', etc.]
      defaultValue: []
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true, // null for global recipes, id for user-created
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    is_popular: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'recipes',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['is_popular']
      },
      {
        fields: ['tags']
      }
    ]
  });

  Recipe.associate = (models) => {
    Recipe.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'creator'
    });
    Recipe.belongsToMany(models.User, {
      through: models.UserRecipe,
      foreignKey: 'recipe_id',
      otherKey: 'user_id',
      as: 'favoritedBy'
    });
  };

  return Recipe;
};
