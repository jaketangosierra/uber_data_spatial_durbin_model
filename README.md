# uber_data_spatial_durbin_model

This package consists of two parts:

- a node.js script for gathering data via the Uber developer API.
- our analysis- R file, which defines our spatial Durbin modeling approach.

## API script (ping_uber.js)
Here, we have included the node-server (ping_uber.js). In our data collection, we wrapped this in a bash script to properly record the data. We also used a Chicago-specific shapefile for gathering data, and used an Uber Developer API key.

Both of these can easily be replaced by developers.

To use this, you will need:

1. A shapefile of the sample areas (e.g. census tracts) in the region of interest. The attributes table should contain the relevant independent variables for the sample areas (e.g. median household income of a census tract, etc.).
2. An Uber Developer account, and an 'application' setup, in order to get an Uber API Server Token.
2. To update config.json, and to define `api_key`, `shapefile_path`, `shapefile_polygon_id`, and `weeks_to_run`

These are defined as:
- `api_key` - the Uber Developer API Server Token for your application.
- `shapefile_path` - the path to the shapefile that contains your sample areas (e.g. census tracts)
- `shapefile_polygon_id` - the name of the column for the unique ID of each sample area (e.g. FIPS code)
- `weeks_to_run` - how many weeks you want to gather Uber data for (defaults to 1)

To run install the necessary node packages, in the root of this directory, use the command:
```
npm install
```

and to run the data collection, use the command:
```
node ping_uber.js
```

This will write the sampled ETA times, the timestamp of the sample, and the `shapefile_polygon_id` as a row into the `uber.db` SQLite database, for use in the R analysis.


## R analysis (analysis)

The easiest way to conduct this analysis is to have a shapefile with your independent variables (e.g. median household income) already stored as attributes. knowledgeable users could also modify this script to join a CSV file containing these variables as needed.

You will need to update line 10 in `uber_analysis.R` to the correct file path for your environment.

This is currently built to:

1. read the same `config.json` file as the node script
2. use the same shapefile defined in `shapefile_path`
2. open the SQLite database, and compute the average ETA for each sample area
3. join that data (the column is called `uber_avg_eta`) to the attributes table of the shapefile
4. build a Queen's weights matrix from the shapefile
5. build the spatial Durbin model
6. compute the impacts

This file describes the scripts and packages we used to implement our spatial Durbin modeling approach. Upon public release, we will write a tutorial to help other researchers download and process the necessary census data and spatial data to make this R script fully operational (although knowledgeable users could do this now).
