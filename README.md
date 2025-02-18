# Note

run 
```
docker-compose up -d
```

and you will get 3 containers and 1 new images and 2 volumns.

**- Container:**
  - newnew-storage-1                                                                                                                                                                                                                              2.5s
  - newnew-mysql-1                                                                                                                                                                                                                            13.1s
  - newnew-web-app-1
   
**- Image:**
  - newnew-web-app

**- Volume:**
  - video_mysql
  - video_storage


## Funtionality
- user can register and login, info are stored in mysql db
- user can upload video which store in the storage server and the path is stored in mysql db
- mysql and storage data mounted with volumne, as long as volumes are not deleted, data will be there
- user can play the uplaoded video
