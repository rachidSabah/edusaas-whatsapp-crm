# Configuration Meta WhatsApp Business API

Ce guide explique comment configurer l'API WhatsApp Business officielle de Meta avec votre application EduSaaS.

## Prérequis

- Un compte Meta (Facebook)
- Une application Meta créée
- Un numéro de téléphone WhatsApp Business
- Un token d'accès Meta valide

## Étapes de Configuration

### 1. Créer une Application Meta

1. Allez sur [Meta App Dashboard](https://developers.facebook.com/apps)
2. Cliquez sur "Créer une application"
3. Choisissez "Business" comme type
4. Remplissez les informations de base
5. Confirmez la création

### 2. Ajouter WhatsApp à Votre Application

1. Dans le tableau de bord de l'application, cliquez sur "Ajouter un produit"
2. Recherchez "WhatsApp" et cliquez sur "Configurer"
3. Suivez les instructions pour lier votre compte WhatsApp Business

### 3. Obtenir les Identifiants Requis

#### Business Account ID
- Allez dans WhatsApp → Paramètres
- Trouvez votre "Business Account ID"
- Exemple: `803001539495988`

#### Phone Number ID
- Allez dans WhatsApp → API Setup
- Trouvez votre "Phone Number ID"
- Exemple: `123456789012345`

#### Access Token
1. Allez dans Paramètres → Tokens
2. Cliquez sur "Générer un token"
3. Sélectionnez les permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Copiez le token généré

### 4. Configurer le Webhook

#### Dans EduSaaS

1. Allez à Dashboard → WhatsApp → Configuration Meta
2. Entrez:
   - Business Account ID
   - Phone Number ID
   - Access Token
3. Cliquez sur "Tester la Connexion"
4. Copiez l'URL du Webhook

#### Dans Meta App Dashboard

1. Allez dans WhatsApp → Configuration
2. Dans la section "Webhook", cliquez sur "Modifier"
3. Collez l'URL du Webhook: `https://votre-domaine.com/api/whatsapp/webhook`
4. Entrez un Verify Token (ex: `my_super_secret_verify_token_123`)
5. Cliquez sur "Vérifier et Enregistrer"

### 5. S'abonner aux Événements

1. Dans Meta App Dashboard, allez à WhatsApp → Configuration
2. Sous "Webhook", dans "Abonnements", sélectionnez:
   - `messages` - Pour recevoir les messages entrants
   - `message_status` - Pour les confirmations de livraison
3. Cliquez sur "Enregistrer"

## Variables d'Environnement

Ajoutez ces variables à votre configuration Cloudflare Pages:

```
WHATSAPP_VERIFY_TOKEN=my_super_secret_verify_token_123
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
```

## Tester l'Intégration

### Envoyer un Message Test

```bash
curl -X POST https://graph.instagram.com/v18.0/YOUR_PHONE_NUMBER_ID/messages \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "33612345678",
    "type": "text",
    "text": {
      "body": "Bonjour, ceci est un message de test!"
    }
  }'
```

### Vérifier les Webhooks

1. Allez dans Meta App Dashboard → Webhooks
2. Cliquez sur "Tester le Webhook"
3. Vérifiez que vous recevez les événements

## Dépannage

### "Webhook verification failed"
- Vérifiez que l'URL du Webhook est correcte
- Assurez-vous que le Verify Token correspond
- Vérifiez que votre serveur répond avec le challenge

### "Invalid access token"
- Vérifiez que le token n'a pas expiré
- Régénérez un nouveau token si nécessaire
- Vérifiez les permissions du token

### "Phone number not registered"
- Assurez-vous que le numéro de téléphone est vérifié dans Meta
- Vérifiez que le Phone Number ID est correct
- Attendez quelques minutes après l'enregistrement

## Limites et Quotas

- **Limite de débit**: 1000 messages par seconde
- **Fenêtre de conversation**: 24 heures pour les messages non-template
- **Modèles de messages**: Utilisez des templates pour les messages hors fenêtre
- **Coût**: Facturé par conversation (voir tarification Meta)

## Ressources Utiles

- [Documentation Meta WhatsApp API](https://developers.facebook.com/docs/whatsapp)
- [Guide de Configuration](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Référence API](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)
- [Gestion des Erreurs](https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes)

## Support

Pour toute question ou problème:
1. Consultez la [documentation Meta](https://developers.facebook.com/docs/whatsapp)
2. Vérifiez les logs de votre application
3. Contactez le support Meta
