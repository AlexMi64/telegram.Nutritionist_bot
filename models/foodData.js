module.exports = (sequelize, DataTypes) => {
  const FoodData = sequelize.define('FoodData', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    fdcId: {
      type: DataTypes.INTEGER,
      unique: true,
      allowNull: false
    },
    dataType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      index: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      index: true
    },
    descriptionEn: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    descriptionRu: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    descriptionLower: {
      type: DataTypes.TEXT,
      allowNull: false,
      index: true
    },
    foodCategoryId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      index: true
    },
    publicationDate: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'food_data',
    indexes: [
      {
        fields: ['descriptionLower'],
        using: 'BTREE'
      },
      {
        fields: ['descriptionEn'],
        using: 'BTREE'
      },
      {
        fields: ['descriptionRu'],
        using: 'BTREE'
      },
      {
        fields: ['dataType', 'foodCategoryId']
      }
    ]
  });

  FoodData.associate = (models) => {
    FoodData.hasMany(models.FoodNutrient, {
      foreignKey: 'foodDataId',
      as: 'nutrients',
      onDelete: 'CASCADE'
    });
  };

  return FoodData;
};
