from django.db import models

class User(models.Model):
    user_id = models.AutoField(primary_key=True)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'test_rds_users'

class Conversation(models.Model):
    conversation_id = models.AutoField(primary_key=True)
    user = models.ForeignKey('User', on_delete=models.CASCADE, db_column='user_id')
    title = models.TextField()
    #mode = models.TextField()
    mode = models.CharField(max_length=20, choices=[('drive', 'Drive'), ('research', 'Research')])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'test_rds_conversation'

class Message(models.Model):
    message_id = models.AutoField(primary_key=True)
    conversation = models.ForeignKey('Conversation', on_delete=models.CASCADE, db_column='conversation_id')
    #role = models.CharField(max_length=100)
    role = models.CharField(max_length=10, choices=[('user', 'User'), ('assistant', 'Assistant')])
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'test_rds_message'