from django.urls import path
from .views import (
    # Favorites
    favorites_list_create,
    favorites_delete,
    
    # Reviews
    reviews_list_create,
    reviews_update_delete,
    
    # Review Comments
    review_comments_list_create,
    review_comments_delete,
    
    # Messages
    messages_inbox,
    messages_outbox,
    messages_send,
    messages_mark_read,
    messages_delete,
)

urlpatterns = [
    # Favorites endpoints
    path('favorites/', favorites_list_create, name='favorites_list_create'),
    path('favorites/<int:favorite_id>/', favorites_delete, name='favorites_delete'),
    
    # Reviews endpoints
    path('reviews/', reviews_list_create, name='reviews_list_create'),
    path('reviews/<int:review_id>/', reviews_update_delete, name='reviews_update_delete'),
    
    # Review Comments endpoints
    path('review-comments/', review_comments_list_create, name='review_comments_list_create'),
    path('review-comments/<int:comment_id>/', review_comments_delete, name='review_comments_delete'),
    
    # Messages endpoints
    path('messages/inbox/', messages_inbox, name='messages_inbox'),
    path('messages/outbox/', messages_outbox, name='messages_outbox'),
    path('messages/send/', messages_send, name='messages_send'),
    path('messages/<int:message_id>/read/', messages_mark_read, name='messages_mark_read'),
    path('messages/<int:message_id>/', messages_delete, name='messages_delete'),
]