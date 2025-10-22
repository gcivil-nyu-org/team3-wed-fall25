from django.db import models


class Neighborhood(models.Model):
    """Placeholder model for neighborhood app"""
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'neighborhood'
