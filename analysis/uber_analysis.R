install.packages('maptools')
install.packages('rjson')
install.packages('RSQLite')
library('maptools')
library('spdep')
library('rjson')
library('RSQLite')
library('DBI')

setwd('/YOUR/WORKING/DIR/uber_data_spatial_durbin_model/')
config<-fromJSON(file='config.json')
config$shapefile_path

con = dbConnect(SQLite(), dbname='uber.db')

db = dbGetQuery(con, paste('select poly_id ', config$shapefile_polygon_id, ', avg(eta) uber_avg_eta from uberx group by poly_id;', sep=""))

shapefile<-readShapePoly(config$shapefile_path)
data<-data.frame(shapefile)

merged_data<-merge(x=data, y=db, by=config$shapefile_polygon_id)

#generate a couple demo variables
merged_data$var1<-rnorm(240)
merged_data$var2<-rnorm(240)

weights<-poly2nb(shapefile)

model<-lagsarlm("uber_avg_eta ~ var1 + var2", data=merged_data, listw=nb2listw(weights), type="mixed")
summary(model)
model_impacts<-impacts(model, listw=nb2listw(weights), R=1000)
summary(model_impacts, zstats=TRUE, short=TRUE)
